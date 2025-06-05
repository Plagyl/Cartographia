import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'd3']
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    }
  }
});
