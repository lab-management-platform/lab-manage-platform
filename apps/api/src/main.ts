import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../../.env") });

import cors from "@fastify/cors";
import Fastify from "fastify";
import { createKernel } from "./kernel.js";

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
