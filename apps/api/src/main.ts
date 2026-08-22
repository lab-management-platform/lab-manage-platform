import cors from "@fastify/cors";
import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import { createKernel } from "./kernel.js";

type CasExchange = { token: string; actor: unknown; expiresAt: number };
const casExchanges = new Map<string, CasExchange>();

function xmlValue(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<[^>]*${tag}[^>]*>([^<]+)</`));
  return match?.[1]?.trim() ?? null;
}

export async function createApiApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });
  const kernel = await createKernel();

  await app.register(cors, { origin: true });

  app.get("/health", async () => ({
    status: "ok",
    plugins: kernel.plugins,
    externalServices: {
      synologyNas: {
        provider: "Synology NAS",
        configured: Boolean(process.env.SYNOLOGY_BASE_URL),
        accessScope: "campus_network_or_vpn",
        note: "NAS requires campus network or campus VPN access"
      }
    }
  }));

  app.post("/auth/login", async (request, reply) => {
    const body = request.body as Partial<{ username: string; password: string }>;
    if (!body.username || !body.password) {
      return reply.code(400).send({ error: "login identifier and password are required" });
    }

    const session = await kernel.login(body.username, body.password);
    if (!session) {
      return reply.code(401).send({ error: "Invalid username or password" });
    }

    return session;
  });

  app.get("/auth/xmu/start", async (request, reply) => {
    if (process.env.XMU_CAS_ENABLED !== "true") {
      return reply.code(404).send({ error: "XMU CAS is not enabled" });
    }
    const service = process.env.XMU_CAS_SERVICE_URL;
    const loginUrl = process.env.XMU_CAS_LOGIN_URL ?? "https://ids.xmu.edu.cn/authserver/login";
    if (!service) {
      return reply.code(503).send({ error: "XMU_CAS_SERVICE_URL is not configured" });
    }
    const url = new URL(loginUrl);
    url.searchParams.set("service", service);
    return reply.redirect(url.toString());
  });

  app.get("/auth/xmu/callback", async (request, reply) => {
    if (process.env.XMU_CAS_ENABLED !== "true") {
      return reply.code(404).send({ error: "XMU CAS is not enabled" });
    }
    const query = request.query as { ticket?: string; service?: string };
    const service = process.env.XMU_CAS_SERVICE_URL;
    const validateUrl =
      process.env.XMU_CAS_VALIDATE_URL ?? "https://ids.xmu.edu.cn/authserver/serviceValidate";
    const frontendUrl =
      process.env.XMU_CAS_FRONTEND_URL ?? new URL("/", service ?? "http://localhost/").origin;
    if (!service || !query.ticket) {
      return reply.code(400).send({ error: "CAS ticket and service are required" });
    }
    if (query.service && query.service !== service) {
      return reply.code(400).send({ error: "CAS service mismatch" });
    }

    const url = new URL(validateUrl);
    url.searchParams.set("ticket", query.ticket);
    url.searchParams.set("service", service);
    const response = await fetch(url);
    const xml = await response.text();
    const subject = xmlValue(xml, "user");
    if (!response.ok || !subject || !xml.includes("authenticationSuccess")) {
      return reply.code(401).send({ error: "XMU CAS authentication failed" });
    }
    if (!kernel.auth.loginExternal) {
      return reply.code(409).send({ error: "XMU CAS account linking is unavailable" });
    }
    const session = await kernel.auth.loginExternal("xmu-cas", subject, subject);
    if (!session) {
      return reply.code(403).send({
        error: "XMU account is authenticated but is not yet an approved lab member",
        subject
      });
    }
    const code = randomUUID();
    casExchanges.set(code, { ...session, expiresAt: Date.now() + 120_000 });
    const frontendBase = frontendUrl.endsWith("/") ? frontendUrl.slice(0, -1) : frontendUrl;
    return reply.redirect(`${frontendBase}/auth/xmu/complete?code=${encodeURIComponent(code)}`);
  });

  app.post("/auth/xmu/exchange", async (request, reply) => {
    const body = request.body as { code?: string };
    const exchange = body.code ? casExchanges.get(body.code) : undefined;
    if (!body.code || !exchange || exchange.expiresAt < Date.now()) {
      if (body.code) casExchanges.delete(body.code);
      return reply.code(401).send({ error: "CAS exchange code is invalid or expired" });
    }
    casExchanges.delete(body.code);
    return exchange;
  });

  // 个人注册不直接创建可登录账号，必须经过管理员审核。
  app.post("/auth/registration", async (request, reply) => {
    const body = request.body as Partial<{
      username: string;
      password: string;
      identityType: "student_no" | "employee_no";
      identityNo: string;
      displayName: string;
      phone: string;
      reason: string;
    }>;
    if (
      !body.username ||
      !body.password ||
      !body.identityType ||
      !body.identityNo ||
      !body.displayName
    ) {
      return reply.code(400).send({
        error: "username, password, identityType, identityNo and displayName are required"
      });
    }
    if (!kernel.auth.submitRegistration) {
      return reply
        .code(409)
        .send({ error: "public registration is unavailable in the current authentication mode" });
    }
    try {
      const result = await kernel.auth.submitRegistration({
        username: body.username,
        password: body.password,
        identityType: body.identityType,
        identityNo: body.identityNo,
        displayName: body.displayName,
        phone: body.phone,
        reason: body.reason
      });
      return reply.code(202).send({
        ...result,
        message: "注册申请已提交，请等待管理员审核。"
      });
    } catch (error) {
      return reply
        .code(error instanceof Error && error.message.includes("exists") ? 409 : 400)
        .send({ error: error instanceof Error ? error.message : "registration request failed" });
    }
  });

  app.get("/auth/me", async (request, reply) => {
    const authorization = Array.isArray(request.headers.authorization)
      ? request.headers.authorization[0]
      : request.headers.authorization;
    const actor = await kernel.authenticate(authorization ?? "");
    if (!actor) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    return actor;
  });

  app.get("/api/v1/me", async (request, reply) => {
    const authorization = Array.isArray(request.headers.authorization)
      ? request.headers.authorization[0]
      : request.headers.authorization;
    const actor = await kernel.authenticate(authorization ?? "");
    if (!actor) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    return actor;
  });

  async function dashboardData(
    actor: NonNullable<Awaited<ReturnType<typeof kernel.authenticate>>>
  ) {
    async function readRoute(path: string, query: Record<string, unknown> = {}) {
      const route = kernel.routes.find((item) => item.method === "GET" && item.path === path);
      if (!route) return null;
      const result = await route.handler({ actor, body: undefined, query, params: {} });
      return result.body;
    }

    const [projectsPayload, inventoryPayload, meetingsPayload, notificationsPayload] =
      await Promise.all([
        readRoute("/projects"),
        readRoute("/inventory/summary"),
        readRoute("/meetings"),
        readRoute("/notifications")
      ]);
    const projects = Array.isArray(projectsPayload) ? projectsPayload : [];
    const meetings = Array.isArray(meetingsPayload) ? meetingsPayload : [];
    const notifications = Array.isArray(notificationsPayload) ? notificationsPayload : [];
    const users = actor.permissions.includes("user:read") ? await kernel.listUsers() : [];
    const projectRecords = projects.filter(
      (item): item is Record<string, unknown> => typeof item === "object" && item !== null
    );
    const annualProjects = projectRecords.reduce<Record<string, number>>((result, project) => {
      const createdAt = String(project.createdAt ?? "");
      const year = createdAt.slice(0, 4);
      if (year) result[year] = (result[year] ?? 0) + 1;
      return result;
    }, {});

    return {
      actor: { id: actor.id, role: actor.role },
      memberCount: users.length,
      projectCount: projects.length,
      activeProjectCount: projectRecords.filter((project) => project.status === "active").length,
      meetingCount: meetings.length,
      notificationCount: notifications.length,
      annualProjects,
      inventory: inventoryPayload ?? {
        materialCount: 0,
        lowStockCount: 0,
        pendingApplications: 0,
        approvedApplications: 0
      }
    };
  }

  async function handleDashboard(
    request: { headers: { authorization?: string | string[] } },
    reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } }
  ) {
    const authorization = Array.isArray(request.headers.authorization)
      ? request.headers.authorization[0]
      : request.headers.authorization;
    const actor = await kernel.authenticate(authorization ?? "");
    if (!actor) return reply.code(401).send({ error: "Unauthorized" });
    return dashboardData(actor);
  }

  app.get("/dashboard", handleDashboard);
  app.get("/api/v1/dashboard", handleDashboard);

  app.get("/auth/profile", async (request, reply) => {
    const authorization = Array.isArray(request.headers.authorization)
      ? request.headers.authorization[0]
      : request.headers.authorization;
    const actor = await kernel.authenticate(authorization ?? "");
    if (!actor) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const profile = await kernel.getUserProfile(actor.id);
    if (!profile) {
      return reply.code(404).send({ error: "User profile not found" });
    }
    return profile;
  });

  app.patch("/auth/profile/contact", async (request, reply) => {
    const authorization = Array.isArray(request.headers.authorization)
      ? request.headers.authorization[0]
      : request.headers.authorization;
    const actor = await kernel.authenticate(authorization ?? "");
    if (!actor) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const body = request.body as Partial<{ phone: string }>;
    if (!body.phone) {
      return reply.code(400).send({ error: "phone is required" });
    }

    try {
      return await kernel.updateContact(actor.id, body.phone);
    } catch (error) {
      return reply
        .code(error instanceof Error && error.message.includes("exists") ? 409 : 400)
        .send({ error: error instanceof Error ? error.message : "contact update failed" });
    }
  });

  app.patch("/auth/profile/password", async (request, reply) => {
    const authorization = Array.isArray(request.headers.authorization)
      ? request.headers.authorization[0]
      : request.headers.authorization;
    const actor = await kernel.authenticate(authorization ?? "");
    if (!actor) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const body = request.body as Partial<{ currentPassword: string; newPassword: string }>;
    if (!body.currentPassword || !body.newPassword) {
      return reply.code(400).send({ error: "currentPassword and newPassword are required" });
    }

    try {
      await kernel.changePassword(actor.id, body.currentPassword, body.newPassword);
      return { ok: true };
    } catch (error) {
      return reply
        .code(error instanceof Error && error.message.includes("incorrect") ? 403 : 400)
        .send({ error: error instanceof Error ? error.message : "password change failed" });
    }
  });

  app.get("/auth/users", async (request, reply) => {
    const authorization = Array.isArray(request.headers.authorization)
      ? request.headers.authorization[0]
      : request.headers.authorization;
    const actor = await kernel.authenticate(authorization ?? "");
    if (!actor) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    try {
      kernel.assertPermission(actor, "user:read");
    } catch {
      return reply.code(403).send({ error: "Permission denied: user:read" });
    }

    const query = request.query as Partial<{ search: string; includeInactive: string }>;
    return kernel.listUsers(query.search, query.includeInactive === "true");
  });

  app.get("/auth/registrations/pending", async (request, reply) => {
    const authorization = Array.isArray(request.headers.authorization)
      ? request.headers.authorization[0]
      : request.headers.authorization;
    const actor = await kernel.authenticate(authorization ?? "");
    if (!actor) return reply.code(401).send({ error: "Unauthorized" });
    try {
      kernel.assertPermission(actor, "user:write");
    } catch {
      return reply.code(403).send({ error: "Permission denied: user:write" });
    }
    if (!kernel.auth.listPendingRegistrations) return reply.send([]);
    return kernel.auth.listPendingRegistrations();
  });

  app.patch("/auth/registrations/:id", async (request, reply) => {
    const authorization = Array.isArray(request.headers.authorization)
      ? request.headers.authorization[0]
      : request.headers.authorization;
    const actor = await kernel.authenticate(authorization ?? "");
    if (!actor) return reply.code(401).send({ error: "Unauthorized" });
    try {
      kernel.assertPermission(actor, "user:write");
    } catch {
      return reply.code(403).send({ error: "Permission denied: user:write" });
    }
    if (!kernel.auth.reviewRegistration)
      return reply.code(409).send({ error: "registration review is unavailable" });
    const body = request.body as Partial<{ action: "approve" | "reject"; remark: string }>;
    if (!body.action || !["approve", "reject"].includes(body.action)) {
      return reply.code(400).send({ error: "action must be approve or reject" });
    }
    try {
      return await kernel.auth.reviewRegistration(
        (request.params as { id: string }).id,
        body.action,
        actor.id,
        body.remark
      );
    } catch (error) {
      return reply
        .code(error instanceof Error && error.message.includes("not found") ? 404 : 400)
        .send({ error: error instanceof Error ? error.message : "registration review failed" });
    }
  });

  app.post("/auth/register", async (request, reply) => {
    const authorization = Array.isArray(request.headers.authorization)
      ? request.headers.authorization[0]
      : request.headers.authorization;
    const actor = await kernel.authenticate(authorization ?? "");
    if (!actor) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    try {
      kernel.assertPermission(actor, "user:write");
    } catch {
      return reply.code(403).send({ error: "Permission denied: user:write" });
    }

    const body = request.body as Partial<{
      username: string;
      password: string;
      identityType: "student_no" | "employee_no";
      identityNo: string;
      displayName: string;
      role: "student" | "professor" | "lab_admin";
    }>;

    if (
      !body.username ||
      !body.password ||
      !body.identityType ||
      !body.identityNo ||
      !body.displayName ||
      !body.role
    ) {
      return reply.code(400).send({
        error: "username, password, identityType, identityNo, displayName and role are required"
      });
    }

    try {
      const user = await kernel.registerLocalUser({
        username: body.username,
        password: body.password,
        identityType: body.identityType,
        identityNo: body.identityNo,
        displayName: body.displayName,
        role: body.role
      });
      return reply.code(201).send(user);
    } catch (error) {
      return reply
        .code(error instanceof Error && error.message.includes("exists") ? 409 : 400)
        .send({ error: error instanceof Error ? error.message : "registration failed" });
    }
  });

  app.patch("/auth/users/:id/password", async (request, reply) => {
    const authorization = Array.isArray(request.headers.authorization)
      ? request.headers.authorization[0]
      : request.headers.authorization;
    const actor = await kernel.authenticate(authorization ?? "");
    if (!actor) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    try {
      kernel.assertPermission(actor, "user:write");
    } catch {
      return reply.code(403).send({ error: "Permission denied: user:write" });
    }

    const params = request.params as { id: string };
    const body = request.body as Partial<{ newPassword: string }>;
    if (!body.newPassword) {
      return reply.code(400).send({ error: "newPassword is required" });
    }

    try {
      await kernel.resetUserPassword(params.id, body.newPassword);
      return { ok: true };
    } catch (error) {
      return reply
        .code(error instanceof Error && error.message.includes("not found") ? 404 : 400)
        .send({ error: error instanceof Error ? error.message : "password reset failed" });
    }
  });

  app.patch("/auth/users/:id/role", async (request, reply) => {
    const authorization = Array.isArray(request.headers.authorization)
      ? request.headers.authorization[0]
      : request.headers.authorization;
    const actor = await kernel.authenticate(authorization ?? "");
    if (!actor) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    try {
      kernel.assertPermission(actor, "user:write");
    } catch {
      return reply.code(403).send({ error: "Permission denied: user:write" });
    }

    const params = request.params as { id: string };
    if (params.id === actor.id) {
      return reply.code(400).send({ error: "cannot change current user role" });
    }

    const body = request.body as Partial<{
      role: "student" | "professor" | "lab_admin";
    }>;
    if (!body.role || !["student", "professor", "lab_admin"].includes(body.role)) {
      return reply.code(400).send({ error: "invalid role" });
    }

    try {
      return await kernel.updateUserRole(params.id, body.role);
    } catch (error) {
      return reply
        .code(error instanceof Error && error.message.includes("not found") ? 404 : 400)
        .send({ error: error instanceof Error ? error.message : "role update failed" });
    }
  });

  app.delete("/auth/users/:id", async (request, reply) => {
    const authorization = Array.isArray(request.headers.authorization)
      ? request.headers.authorization[0]
      : request.headers.authorization;
    const actor = await kernel.authenticate(authorization ?? "");
    if (!actor) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    try {
      kernel.assertPermission(actor, "user:write");
    } catch {
      return reply.code(403).send({ error: "Permission denied: user:write" });
    }

    const params = request.params as { id: string };
    if (params.id === actor.id) {
      return reply.code(400).send({ error: "cannot delete current user" });
    }

    try {
      await kernel.deactivateUser(params.id);
      return { ok: true };
    } catch (error) {
      return reply
        .code(error instanceof Error && error.message.includes("not found") ? 404 : 400)
        .send({ error: error instanceof Error ? error.message : "user deletion failed" });
    }
  });

  app.get("/events", async (request, reply) => {
    const query = request.query as Partial<{ token: string }>;
    const authorization = Array.isArray(request.headers.authorization)
      ? request.headers.authorization[0]
      : request.headers.authorization;
    const actor = await kernel.authenticate(authorization ?? query.token ?? "");
    if (!actor) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    reply.hijack();
    const origin = Array.isArray(request.headers.origin)
      ? request.headers.origin[0]
      : request.headers.origin;
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": origin ?? "*",
      Vary: "Origin",
      "X-Accel-Buffering": "no"
    });
    reply.raw.write(
      `event: ready\ndata: ${JSON.stringify({ actorId: actor.id, connectedAt: new Date().toISOString() })}\n\n`
    );

    const unsubscribe = kernel.subscribeAllEvents((event) => {
      reply.raw.write(`event: domain-event\ndata: ${JSON.stringify(event)}\n\n`);
    });
    const heartbeat = setInterval(() => {
      reply.raw.write(`event: ping\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
    }, 30000);

    request.raw.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
      reply.raw.end();
    });
  });

  for (const route of kernel.routes) {
    for (const url of [route.path, `/api/v1${route.path}`]) {
      app.route({
        method: route.method,
        url,
        handler: async (request, reply) => {
          const authorization = Array.isArray(request.headers.authorization)
            ? request.headers.authorization[0]
            : request.headers.authorization;
          const actor = await kernel.authenticate(authorization ?? "");
          if (route.permission && !actor) {
            return reply.code(401).send({ error: "Unauthorized" });
          }

          if (route.permission && actor) {
            kernel.assertPermission(actor, route.permission);
          }

          const result = await route.handler({
            actor,
            body: request.body,
            query: request.query,
            params: request.params as Record<string, string>
          });

          return reply.code(result.status ?? 200).send(result.body);
        }
      });
    }
  }

  return app;
}

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.API_PORT ?? 3000);
  const app = await createApiApp();
  await app.listen({ host: "0.0.0.0", port });
}
