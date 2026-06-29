import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const usePolling = process.env.CHOKIDAR_USEPOLLING === "true";
const pollingInterval = Number(process.env.CHOKIDAR_INTERVAL ?? "300");

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    watch: usePolling
      ? {
          usePolling: true,
          interval: pollingInterval
        }
      : undefined
  }
});
