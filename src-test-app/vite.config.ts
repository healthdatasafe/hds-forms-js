import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import backloop from 'vite-plugin-backloop.dev';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), ...(mode !== 'raw' ? [backloop('forms')] : [])],
  resolve: {
    alias: {
      'hds-forms': path.resolve(__dirname, '../src')
    },
    dedupe: ['hds-lib', 'react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['hds-lib']
  },
  base: './',
  build: {
    outDir: path.resolve(__dirname, '../dist'),
    emptyOutDir: true
  }
}));
