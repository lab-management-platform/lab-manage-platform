import { createAuthAdapter, Kernel } from "@lab/core";
import { aiPlugin } from "@lab/plugin-ai";
import { collaborationPlugin } from "@lab/plugin-collaboration";
import { filesPlugin } from "@lab/plugin-files";
import { helloWorldPlugin } from "@lab/plugin-hello-world";
import { inventoryPlugin } from "@lab/plugin-inventory";
import { projectsPlugin } from "@lab/plugin-projects";
import { ConsoleLogger, createAuditAdapter } from "./adapters.js";

export async function createKernel(): Promise<Kernel> {
  const auth = createAuthAdapter(process.env.DATABASE_URL);
  if ("initialize" in auth && typeof auth.initialize === "function") {
    await auth.initialize();
  }
  const audit = createAuditAdapter(process.env.DATABASE_URL);
  if ("initialize" in audit && typeof audit.initialize === "function") {
    await audit.initialize();
  }

  const kernel = new Kernel({
    auth,
    audit,
    logger: new ConsoleLogger()
  });

  await kernel.register(helloWorldPlugin);
  await kernel.register(inventoryPlugin);
  await kernel.register(filesPlugin);
  await kernel.register(collaborationPlugin);
  await kernel.register(aiPlugin);
  await kernel.register(projectsPlugin);

  return kernel;
}
