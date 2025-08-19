import { defineConfig } from 'vite';
export default defineConfig({
  root: 'src',
  server: { host: '0.0.0.0', port: 5173 },
  build: { outDir: '../dist', emptyOutDir: true }
});
