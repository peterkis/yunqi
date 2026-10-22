import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, 'YUNQI_');

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/v1/yunqi/': {
          target: env.YUNQI_DEV_API_TARGET || 'http://127.0.0.1:3000',
        },
      },
    },
  };
});
