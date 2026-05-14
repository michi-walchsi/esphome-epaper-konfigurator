import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  publicDir: command === 'build' ? false : 'public',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
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
