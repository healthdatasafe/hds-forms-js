import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'js',
    lib: {
      entry: { 'hds-forms': 'src/index.ts', conversation: 'src/conversation/index.ts' },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'mjs' : 'js'}`
    },
    rollupOptions: {
      // the peer dependencies: the host's one copy, never a second one in the bundle
      external: ['react', 'react-dom', 'react/jsx-runtime', 'hds-lib', /^pdfjs-dist(\/|$)/, /^hds-feminine-cycle-ui(\/|$)/],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
          'hds-lib': 'HDSLib'
        }
      }
    }
  }
});
