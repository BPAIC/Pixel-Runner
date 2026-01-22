import { defineConfig } from 'vite';

const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  server: {
    host: true,
    port: 5173
  },
  build: {
    outDir: 'dist'
  }
});
