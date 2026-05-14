import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Dev-Server: public/ für Favicon usw. — Build: nichts kopieren
  publicDir: command === 'build' ? false : 'public',
  build: {
    lib: {
      entry: 'src/ha-panel.jsx',
      formats: ['iife'],
      name: 'EsphomeEpaperPanel',
      fileName: () => 'panel.js',
    },
    outDir: 'custom_components/esphome_epaper_konfigurator/www',
    emptyOutDir: true,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
}));
