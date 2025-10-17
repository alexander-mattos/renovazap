import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/status': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/connect': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/pair-code': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
