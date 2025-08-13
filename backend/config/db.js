import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const dbPath = path.resolve('../../db/database.sqlite');
const dbDir = path.dirname(dbPath);

console.log(`[DB] Chemin de la base de données: ${dbPath}`); // Log 1

// Vérification de l'existence du fichier
if (!fs.existsSync(dbPath)) {
    console.log('[DB] Fichier de base de données non trouvé, création...'); // Log 2
} else {
    console.log('[DB] Fichier de base de données existant trouvé'); // Log 3
}

// Crée le dossier si inexistant
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Ouvre la base de données
const db = new Database(dbPath);
console.log('[DB] Connexion établie avec succès'); // Log 4

try {
    db.exec('SELECT 1');
    console.log('[DB] Test de requête réussi'); // Log 5
} catch (err) {
    console.error('[DB] Échec du test de requête:', err); // Log 6
}

// Crée la table si elle n'existe pas
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    mfa_enabled BOOLEAN DEFAULT 0,
    mfa_secret TEXT,
    mfa_temp_secret TEXT,
    google_account BOOLEAN DEFAULT 0,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

try {
    db.exec('DELETE FROM users');
    console.log('[DB] Table users vidée');
} catch (err) {
    console.error('[DB] Impossible de vider la table users:', err);
}

export default db;
