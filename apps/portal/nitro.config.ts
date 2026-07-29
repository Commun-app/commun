import { defineConfig } from 'nitro/config';

export default defineConfig({
  serverDir: 'server',
  compatibilityDate: '2026-05-19',
  devServer: {
    hostname: '127.0.0.1',
    port: 3002,
  },
});
