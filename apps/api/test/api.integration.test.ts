import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApiApp } from "../src/main.js";

describe("api integration", () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = await createApiApp();
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        username: "admin",
        password: "Admin@123456"
      }
    });
    expect(response.statusCode).toBe(200);
    token = response.json<{ token: string }>().token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("exposes health and authenticated profile endpoints", async () => {
    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json<{ plugins: string[] }>().plugins).toContain("inventory");

    const profile = await app.inject({
      method: "GET",
      url: "/auth/profile",
      headers: { authorization: `Bearer ${token}` }
    });
    expect(profile.statusCode).toBe(200);
    expect(profile.json<{ username: string }>().username).toBe("admin");
  });

  it("creates a user, updates role, and removes the user through HTTP contracts", async () => {
    const suffix = Date.now();
    const created = await app.inject({
      method: "POST",
      url: "/auth/register",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        username: `api${suffix}`,
        password: "Student@123456",
        studentId: `A${suffix}`,
        displayName: `接口测试${suffix}`,
        role: "member"
      }
    });
    expect(created.statusCode).toBe(201);
    const userId = created.json<{ id: string }>().id;

    const roleChanged = await app.inject({
      method: "PATCH",
      url: `/auth/users/${userId}/role`,
      headers: { authorization: `Bearer ${token}` },
      payload: { role: "admin" }
    });
    expect(roleChanged.statusCode).toBe(200);
    expect(roleChanged.json<{ role: string }>().role).toBe("admin");

    const roleRestored = await app.inject({
      method: "PATCH",
      url: `/auth/users/${userId}/role`,
      headers: { authorization: `Bearer ${token}` },
      payload: { role: "member" }
    });
    expect(roleRestored.statusCode).toBe(200);

    const deleted = await app.inject({
      method: "DELETE",
      url: `/auth/users/${userId}`,
      headers: { authorization: `Bearer ${token}` }
    });
    expect(deleted.statusCode).toBe(200);

    const listed = await app.inject({
      method: "GET",
      url: `/auth/users?search=api${suffix}`,
      headers: { authorization: `Bearer ${token}` }
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json<unknown[]>()).toHaveLength(0);
  });

  it("returns inventory stock movements after stock-in", async () => {
    const stockIn = await app.inject({
      method: "PATCH",
      url: "/inventory/materials/m-001/stock-in",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        quantity: 2,
        remark: "api integration test"
      }
    });
    expect(stockIn.statusCode).toBe(200);

    const movements = await app.inject({
      method: "GET",
      url: "/inventory/stock-movements",
      headers: { authorization: `Bearer ${token}` }
    });
    expect(movements.statusCode).toBe(200);
    expect(movements.json<Array<{ type: string; materialId: string; quantity: number }>>()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          materialId: "m-001",
          quantity: 2,
          type: "stock_in"
        })
      ])
    );
  });

  it("registers files with versions and downloads inline content", async () => {
    const suffix = Date.now();
    const contentBase64 = Buffer.from(`hello-${suffix}`, "utf8").toString("base64");
    const created = await app.inject({
      method: "POST",
      url: "/files",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: `文件测试${suffix}`,
        category: "template",
        tags: ["api", "version"],
        visibility: "public",
        description: "api integration test",
        originalName: `file-${suffix}.txt`,
        mimeType: "text/plain",
        sizeBytes: Buffer.byteLength(`hello-${suffix}`),
        contentBase64
      }
    });
    expect(created.statusCode).toBe(201);
    const file = created.json<{ id: string; title: string; currentVersion: number }>();
    expect(file.title).toBe(`文件测试${suffix}`);

    const listed = await app.inject({
      method: "GET",
      url: `/files?search=${suffix}`,
      headers: { authorization: `Bearer ${token}` }
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json<Array<{ title: string; currentVersion: number }>>()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentVersion: expect.any(Number),
          title: `文件测试${suffix}`
        })
      ])
    );

    const versions = await app.inject({
      method: "GET",
      url: `/files/${file.id}/versions`,
      headers: { authorization: `Bearer ${token}` }
    });
    expect(versions.statusCode).toBe(200);
    const versionId = versions.json<Array<{ id: string; version: number }>>()[0]?.id;
    expect(versionId).toBeTruthy();

    const download = await app.inject({
      method: "GET",
      url: `/files/${file.id}/versions/${versionId}/download`,
      headers: { authorization: `Bearer ${token}` }
    });
    expect(download.statusCode).toBe(200);
    expect(download.json<{ contentBase64: string }>().contentBase64).toBe(contentBase64);
  });

  it("creates meetings and publishes notifications", async () => {
    const suffix = Date.now();
    const created = await app.inject({
      method: "POST",
      url: "/meetings",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: `接口会议${suffix}`,
        startsAt: new Date(Date.now() + 60_000).toISOString(),
        endsAt: new Date(Date.now() + 120_000).toISOString(),
        location: "测试会议室",
        onlineUrl: `https://meeting.tencent.com/${suffix}`,
        participantIds: ["u-admin"],
        summary: "api integration test"
      }
    });
    expect(created.statusCode).toBe(201);
    const meeting = created.json<{ id: string; title: string }>();
    expect(meeting.title).toBe(`接口会议${suffix}`);

    const meetings = await app.inject({
      method: "GET",
      url: "/meetings",
      headers: { authorization: `Bearer ${token}` }
    });
    expect(meetings.statusCode).toBe(200);
    expect(meetings.json<Array<{ title: string }>>()).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: `接口会议${suffix}` })])
    );

    const notifications = await app.inject({
      method: "GET",
      url: "/notifications",
      headers: { authorization: `Bearer ${token}` }
    });
    expect(notifications.statusCode).toBe(200);
    expect(notifications.json<Array<{ title: string }>>()).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: `会议邀请：接口会议${suffix}`
        })
      ])
    );
  });
});
