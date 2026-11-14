import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the built site works from any folder (GitHub Pages project sites included).
export default defineConfig({
  base: './',
  // The theme loads Figtree from a font service; serve it from the bundle instead.
  resolve: { alias: { '@astryxdesign/theme-neutral/fonts.css': fileURLToPath(new URL('./src/fonts.css', import.meta.url)) } },
  plugins: [react()],
  test: { environment: 'node', include: ['src/**/*.test.js'] },
});
