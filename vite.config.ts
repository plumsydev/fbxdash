import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Explicitly load .env / .env.local into process.env so PORT, VITE_PORT, etc.
  // are respected here regardless of how this config is invoked (vite, vite build, tests).
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') };

  return {
    server: {
      port: parseInt(env.VITE_PORT || '3000', 10),
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: `http://localhost:${env.PORT || env.SERVER_PORT || '3001'}`,
          changeOrigin: true
        },
        '/ws': {
          target: `ws://localhost:${env.PORT || env.SERVER_PORT || '3001'}`,
          ws: true,
          changeOrigin: true
        }
      }
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
