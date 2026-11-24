import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        game: resolve(import.meta.dirname, 'index.html'),
        leaderboard: resolve(import.meta.dirname, 'leaderboard.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/mapillary-js/')) return 'mapillary';
          if (id.includes('/node_modules/maplibre-gl/')) return 'maplibre';
        },
      },
    },
  },
});
