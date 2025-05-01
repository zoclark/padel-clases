import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    base: mode === 'production' ? '/static/' : '/',
    build: {
      outDir: '../backend/staticfiles',
      assetsDir: 'assets',
      emptyOutDir: true,
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'), // << ESTA LÍNEA
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      __APP_ENV__: JSON.stringify(env.VITE_ENV),
    },
  };
});
