import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import fs from 'fs';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Vérifie si on est en dev et si le certificat existe
  let httpsConfig = false;
  if (mode === 'development') {
    const keyPath = path.resolve(__dirname, 'cert/key.pem');
    const certPath = path.resolve(__dirname, 'cert/cert.pem');
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      httpsConfig = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
    }
  }

  return {
    root: './src',
    build: {
      outDir: '../dist',
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@scripts': path.resolve(__dirname, './src/scripts'),
        '@config': path.resolve(__dirname, './config.ts'),
      },
    },
    plugins: [tsconfigPaths()],
    server: {
      port: 5173,
      https: httpsConfig,
    },
    envPrefix: 'VITE_',
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
      'import.meta.env.VITE_CLIENT_ID_GOOGLE': JSON.stringify(env.VITE_CLIENT_ID_GOOGLE),
    },
  };
});
