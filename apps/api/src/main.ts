import cors from "@fastify/cors";
import Fastify from "fastify";
import { createKernel } from "./kernel.js";

export async function createApiApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });
  const kernel = await createKernel();

  await app.register(cors, { origin: true });

  app.get("/health", async () => ({
    status: "ok",
    plugins: kernel.plugins
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

  // 忘记密码：通过用户名/学号 + 手机号验证，重置为随机密码
  app.post("/auth/forgot-password", async (request, reply) => {
    const { identifier, phone } = (request.body ?? {}) as {
      identifier?: string;
      phone?: string;
    };
    if (!identifier?.trim() || !phone?.trim()) {
      return reply.code(400).send({ error: "请提供账号/学号/工号和绑定的手机号" });
    }

    try {
      const newPassword = await kernel.resetPasswordByIdentifier(identifier, phone);
      return { newPassword };
    } catch (error) {
      return reply.code(400).send({
        error:
          error instanceof Error
            ? error.message
            : "验证失败，请确认信息后重试，或联系实验室管理员。"
      });
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
      studentId: string;
      displayName: string;
      role: "student" | "professor" | "lab_admin";
    }>;

    if (!body.username || !body.password || !body.studentId || !body.displayName || !body.role) {
      return reply
        .code(400)
        .send({ error: "username, password, studentId, displayName and role are required" });
    }

    try {
      const user = await kernel.registerLocalUser({
        username: body.username,
        password: body.password,
        studentId: body.studentId,
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
      role: "student" | "professor" | "lab_admin" | "member" | "admin";
    }>;
    if (
      !body.role ||
      !["student", "professor", "lab_admin", "member", "admin"].includes(body.role)
    ) {
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
    app.route({
      method: route.method,
      url: route.path,
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

  return app;
}

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.API_PORT ?? 3000);
  const app = await createApiApp();
  await app.listen({ host: "0.0.0.0", port });
}
