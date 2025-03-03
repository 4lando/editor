import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    open: true,
    fs: {
      // Allow serving files from one level up to the src directory
      allow: [".."],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "monaco-editor": path.resolve(__dirname, "node_modules/monaco-editor"),
    },
    preserveSymlinks: true,
  },
  worker: {
    format: "es",
    plugins: [],
    rollupOptions: {
      output: {
        sourcemap: false, // Disable source maps for workers
      },
    },
  },
  optimizeDeps: {
    include: [
      "monaco-editor/esm/vs/language/json/json.worker",
      "monaco-editor/esm/vs/editor/editor.worker",
      "react",
      "react-dom",
    ],
    exclude: ["monaco-editor"],
  },
  build: {
    outDir: "public",
    assetsDir: "assets",
    sourcemap: true, // Enable source maps for main bundle
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ["monaco-editor"],
          editor: ["monaco-editor/esm/vs/editor/editor.worker"],
          json: ["monaco-editor/esm/vs/language/json/json.worker"],
          vendor: ["react", "react-dom"],
        },
      },
    },
  },
  publicDir: "static",
});
