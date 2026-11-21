import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import backloop from 'vite-plugin-backloop.dev';
import path from 'path';

export default defineConfig(({ mode }) => ({
  // DEV_PORT: base 5173 plus the workspace offset, set by `_local` ws-run.js.
  plugins: [react(), tailwindcss(), ...(mode !== 'raw' ? [backloop('forms', Number(process.env.DEV_PORT) || 5173)] : [])],
  resolve: {
    alias: {
      'hds-forms': path.resolve(__dirname, '../src')
    },
    dedupe: ['hds-lib', 'hds-react-timeline', 'hds-feminine-cycle-ui', 'react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['hds-lib', 'react-dom', 'react-dom/client'],
    exclude: ['hds-react-timeline']
  },
  base: './',
  build: {
    outDir: path.resolve(__dirname, '../dist'),
    emptyOutDir: true
  }
}));
