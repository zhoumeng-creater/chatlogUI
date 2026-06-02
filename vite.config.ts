import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@l1": path.resolve(__dirname, "./src/l1-entry"),
      "@l2": path.resolve(__dirname, "./src/l2-coordinator"),
      "@l3": path.resolve(__dirname, "./src/l3-molecule"),
      "@l4": path.resolve(__dirname, "./src/l4-atom"),
    },
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 5174,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    // The 3D graph stack is explicitly click-loaded; Three's core module is
    // larger than Vite's default 500 kB warning threshold by itself.
    chunkSizeWarningLimit: 1250,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const moduleId = id.replace(/\\/g, "/");

          if (!moduleId.includes("/node_modules/")) {
            return undefined;
          }

          if (
            moduleId.includes("/node_modules/three/") ||
            moduleId.includes("/node_modules/@react-three/") ||
            moduleId.includes("/node_modules/d3-force-3d/")
          ) {
            return "vendor-graph-3d";
          }

          return undefined;
        },
      },
    },
  },
}));
