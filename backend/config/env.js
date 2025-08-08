// backend/config/env.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charge le .env à la racine du projet (../.env depuis backend/config)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Liste des variables essentielles que tu veux vérifier
const required = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  // ajoute d'autres variables requises ici si besoin
];

const missing = required.filter((k) => !process.env[k]);

if (missing.length) {
  console.warn(`[env] Variables d'environnement manquantes: ${missing.join(', ')}`);
  // En prod, on peut choisir de planter pour empêcher un démarrage incorrect :
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Variables d'environnement manquantes en production: ${missing.join(', ')}`);
  }
}

const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 3000),
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  DB_PATH: process.env.DB_PATH || './data/database.sqlite',
  // ajoute ici d'autres valeurs extraites de process.env si nécessaire
};

export default config;
