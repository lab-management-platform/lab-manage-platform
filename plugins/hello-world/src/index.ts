import type { PluginManifest } from "@lab/core";

export const helloWorldPlugin: PluginManifest = {
  name: "hello-world",
  version: "0.1.0",
  description: "用于验证插件开发流程的最小示例模块",
  capabilities: ["demo:greeting"],
  routes: [
    {
      method: "GET",
      path: "/plugins/hello-world",
      summary: "返回插件问候语"
    }
  ],
  eventsPublished: [],
  eventsSubscribed: [],
  async activate() {
    return {
      name: "hello-world",
      routes: [
        {
          method: "GET",
          path: "/plugins/hello-world",
          summary: "返回插件问候语",
          handler: () => ({
            body: {
              message: "Hello from a decoupled lab-management plugin."
            }
          })
        }
      ]
    };
  }
};
