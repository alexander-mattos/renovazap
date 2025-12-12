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
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
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
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: [
      'renovazap.conversaexpress.com.br',
      'localhost',
      '127.0.0.1'
    ]
  }
});
