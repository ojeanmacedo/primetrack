import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Version bump trigger: 1.0.1// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false, // Impede a exposição dos arquivos fonte (.jsx, .ts) no DevTools do navegador
    minify: true
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/pixel.js': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
});
