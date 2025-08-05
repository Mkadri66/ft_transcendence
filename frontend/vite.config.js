import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => {
  // Charge explicitement les variables d'environnement
  const env = loadEnv(mode, process.cwd(), '');

  // Debug : affiche les variables chargées dans le terminal
  console.log('Variables d\'environnement chargées :', {
    VITE_API_URL: env.VITE_API_URL,
    Mode: mode
  });

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
    },
    envPrefix: 'VITE_',
    
    // Injection explicite pour le frontend (optionnel mais utile)
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
      'import.meta.env.VITE_CLIENT_ID_GOOGLE': JSON.stringify(env.VITE_CLIENT_ID_GOOGLE)
    }
  };
});