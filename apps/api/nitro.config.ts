import { defineConfig } from 'nitro/config';

export default defineConfig({
  serverDir: 'server',
  compatibilityDate: '2026-05-19',
  runtimeConfig: {
    // Instance data directory (overridable via COMMUN_DATA_DIR).
    communDataDir: process.env.COMMUN_DATA_DIR ?? '',
  },
  devServer: {
    hostname: '127.0.0.1',
    port: 3001,
  },
});
