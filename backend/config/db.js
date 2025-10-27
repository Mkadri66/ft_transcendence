import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { randomInt } from 'crypto';

const dbPath = path.resolve('../../db/database.sqlite');
const dbDir = path.dirname(dbPath);

console.log(`[DB] Chemin de la base de données: ${dbPath}`);

// Vérification du fichier
if (!fs.existsSync(dbPath)) {
    console.log('[DB] Fichier de base de données non trouvé, création...');
} else {
    console.log('[DB] Fichier de base de données existant trouvé');
}

// Crée le dossier si inexistant
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Connexion
const db = new Database(dbPath);
console.log('[DB] Connexion établie avec succès');

try {
    db.exec('SELECT 1');
    console.log('[DB] Test de requête réussi');
} catch (err) {
    console.error('[DB] Échec du test de requête:', err);
}

// --- 1️⃣ Création des tables ---
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    mfa_secret TEXT,
    google_account BOOLEAN DEFAULT 0,
    jwt_token TEXT,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    game_name TEXT NOT NULL,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    winner_id INTEGER,
    winner_alias TEXT,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
    FOREIGN KEY (winner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS user_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total_games INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    last_played DATETIME,
    highest_score INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS game_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    user_id INTEGER,
    player_alias TEXT,
    score INTEGER DEFAULT 0,
    FOREIGN KEY (game_id) REFERENCES games(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    friend_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (friend_id) REFERENCES users(id),
    UNIQUE (user_id, friend_id) 
  );

  CREATE TABLE IF NOT EXISTS blocked_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    blocked_user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (blocked_user_id) REFERENCES users(id),
    UNIQUE (user_id, blocked_user_id)
  );
`);

// --- 2️⃣ Ajouter des utilisateurs test ---
const superheroes = [
    'ironman',
    'captainamerica',
    'thor',
    'hulk',
    'blackwidow',
    'hawkeye',
    'spiderman',
    'blackpanther',
    'doctorstrange',
    'scarletwitch',
];

superheroes.forEach((name) => {
    const email = `${name}@heroes.com`;
    const password = 'SecurePass123!';
    const avatar = `${name}.png`;

    try {
        db.prepare(
            `INSERT INTO users (username, email, password, avatar) VALUES (?, ?, ?, ?)`
        ).run(name, email, password, avatar);

        const userId = db
            .prepare('SELECT id FROM users WHERE username = ?')
            .get(name).id;

        db.prepare(`INSERT INTO user_stats (user_id) VALUES (?)`).run(userId);
    } catch (err) {
        //console.error('Utilisateur déjà existant ou erreur :', err);
    }
});

// --- 3️⃣ Générer 10 tournois avec matchs ---
const allUsers = db.prepare('SELECT id FROM users').all();

for (let t = 1; t <= 10; t++) {
    const { lastInsertRowid: tournamentId } = db
        .prepare(`INSERT INTO tournaments (name) VALUES (?)`)
        .run(`Tournoi ${t}`);

    // Chaque tournoi contient entre 3 et 6 matchs
    const numGames = randomInt(3, 7);

    for (let g = 1; g <= numGames; g++) {
        // Sélectionner aléatoirement 3 à 5 joueurs
        const numPlayers = randomInt(3, 6);
        const playerIds = allUsers
            .sort(() => 0.5 - Math.random())
            .slice(0, numPlayers)
            .map((u) => u.id);

        const winnerId = playerIds[randomInt(0, playerIds.length)];

        const { lastInsertRowid: gameId } = db
            .prepare(
                `INSERT INTO games (tournament_id, game_name, winner_id)
         VALUES (?, ?, ?)`
            )
            .run(tournamentId, `Match ${g} - Tournoi ${t}`, winnerId);

        playerIds.forEach((uid) => {
            const score = randomInt(0, 5);

            db.prepare(
                `INSERT INTO game_players (game_id, user_id, score)
         VALUES (?, ?, ?)`
            ).run(gameId, uid, score);

            let stats = db
                .prepare('SELECT * FROM user_stats WHERE user_id = ?')
                .get(uid);

            if (!stats) {
                db.prepare('INSERT INTO user_stats (user_id) VALUES (?)').run(
                    uid
                );
                stats = {
                    total_games: 0,
                    wins: 0,
                    losses: 0,
                    highest_score: 0,
                };
            }

            const totalGames = stats.total_games + 1;
            const wins = stats.wins + (uid === winnerId ? 1 : 0);
            const losses = stats.losses + (uid === winnerId ? 0 : 1);
            const highestScore = Math.max(stats.highest_score, score);

            db.prepare(
                `UPDATE user_stats
         SET total_games = ?, wins = ?, losses = ?, last_played = CURRENT_TIMESTAMP, highest_score = ?
         WHERE user_id = ?`
            ).run(totalGames, wins, losses, highestScore, uid);
        });
    }
}

// --- 4️⃣ Vérif globale : afficher les stats ---
const statsTable = db
    .prepare(
        `
SELECT 
  u.username,
  s.total_games,
  s.wins,
  s.losses,
  s.highest_score,
  s.last_played
FROM user_stats s
JOIN users u ON u.id = s.user_id
ORDER BY s.wins DESC, s.highest_score DESC
`
    )
    .all();

console.log(
    '✅ BDD initialisée avec utilisateurs, tournois, parties et stats.'
);

export default db;
