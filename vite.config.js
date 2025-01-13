import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    open: true,
    fs: {
      // Allow serving files from one level up to the src directory
      allow: ['..'],
    },
  },
  resolve: {
    alias: {
      'monaco-editor': path.resolve(__dirname, 'node_modules/monaco-editor'),
    },
    preserveSymlinks: true,
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    include: [
      'monaco-editor/esm/vs/language/json/json.worker',
      'monaco-editor/esm/vs/editor/editor.worker',
    ],
    exclude: ['monaco-editor'],
  },
  build: {
    outDir: 'public',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ['monaco-editor'],
          editor: ['monaco-editor/esm/vs/editor/editor.worker'],
          json: ['monaco-editor/esm/vs/language/json/json.worker'],
        },
      },
    },
  },
  publicDir: 'static',
});