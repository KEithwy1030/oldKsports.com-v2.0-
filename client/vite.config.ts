import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 5173, // 开发环境端口
      host: '0.0.0.0', // Docker环境需要监听所有接口
      strictPort: true, // 端口被占用时直接报错
      proxy: mode === 'development' ? {
        '/api': {
          target: process.env.VITE_BACKEND_URL || `http://localhost:8080`, // 本地开发使用localhost:8080
          changeOrigin: true,
          // 不重写路径，保持 /api 前缀
        },
        '/uploads': {
          target: process.env.VITE_BACKEND_URL || `http://localhost:8080`, // 本地开发使用localhost:8080
          changeOrigin: true,
          // 不重写路径，保持 /uploads 前缀
        },
      } : {},
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      minify: 'terser',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom']
          }
        }
      }
    }
  };
});