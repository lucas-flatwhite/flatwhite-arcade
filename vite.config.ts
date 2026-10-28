import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// lucasflatwhite.com serves this build at /arcade/ through a Vercel rewrite, so the pages
// are built under dist/arcade/ and every asset URL starts with /arcade/.
export default defineConfig({
  base: '/arcade/',
  build: {
    outDir: 'dist/arcade',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        lobby: resolve(import.meta.dirname, 'index.html'),
        snake: resolve(import.meta.dirname, 'snake/index.html'),
      },
    },
  },
});
