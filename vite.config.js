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
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core Monaco Editor
          'monaco': ['monaco-editor'],
          
          // Workers
          'editor-worker': ['monaco-editor/esm/vs/editor/editor.worker'],
          'json-worker': ['monaco-editor/esm/vs/language/json/json.worker'],
          
          // YAML language support
          'yaml': ['monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution'],
        },
      },
    },
  },
  publicDir: 'static',
}); 