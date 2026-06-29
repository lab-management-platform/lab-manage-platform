import { describe, expect, it } from "vitest";
import { createKernel } from "../src/kernel.js";

describe("kernel", () => {
  it("loads plugins through manifests", async () => {
    const kernel = await createKernel();

    expect(kernel.plugins).toEqual([
      "hello-world",
      "inventory",
      "files",
      "collaboration",
      "ai",
      "projects"
    ]);
    expect(kernel.routes.map((route) => route.path)).toContain("/plugins/hello-world");
    expect(kernel.routes.map((route) => route.path)).toContain("/files");
    expect(kernel.routes.map((route) => route.path)).toContain("/meetings");
    expect(kernel.routes.map((route) => route.path)).toContain("/notifications");
    expect(kernel.routes.map((route) => route.path)).toContain("/projects");
  });
});
