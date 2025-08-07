import fastify from 'fastify';
import cors from '@fastify/cors';
import { OAuth2Client } from 'google-auth-library';
import db from './db.js';
import dotenv from 'dotenv';
import fastifyHelmet from '@fastify/helmet';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/auth/google/callback' // redirection après login
);

const app = fastify();

// Middlewares essentiels
app.register(cors, {
    origin: 'http://localhost:5173', // Doit matcher exactement l'URL du front
    methods: ['GET', 'POST', 'OPTIONS'], // OPTIONS est crucial pour les pré-vols
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    preflightContinue: true, // Important pour les requêtes OPTIONS
});
app.register(fastifyHelmet, {
    contentSecurityPolicy: false, // Désactivez si vous utilisez déjà CSP ailleurs
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, // Autorise les popups
});

// Route GET /
app.get('/', async (request, reply) => {
    return { hello: 'world' };
});

app.post('/register', async (request, reply) => {
    console.log('[REGISTER] Requête reçue. Corps:', request.body);
    const { username, email, password, confirmPassword, avatar } = request.body;

    // Validation des données
    console.log('[VALIDATION] Début validation des données');
    if (password !== confirmPassword) {
        console.log(
            '[VALIDATION] Erreur: Les mots de passe ne correspondent pas'
        );
        return reply.status(400).send({
            error: 'Les mots de passe ne correspondent pas',
        });
    }

    const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        console.log('[VALIDATION] Erreur: Mot de passe trop faible');
        return reply.status(400).send({
            error: 'Le mot de passe doit contenir : 8+ caractères, 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial (@$!%*?&)',
        });
    }

    try {
        console.log('[DB] Vérification des doublons pour:', {
            email,
            username,
        });
        const existingUser = db
            .prepare(
                'SELECT id, username, email, mfa_enabled FROM users WHERE email = ? OR username = ?'
            )
            .get(email, username);

        console.log(
            '[DB] Résultat vérification doublons:',
            existingUser || 'Aucun doublon trouvé'
        );

        if (existingUser) {
            if (existingUser.mfa_enabled === 0) {
                console.log(
                    '[MFA] Utilisateur existe mais MFA non configuré. ID:',
                    existingUser.id
                );
                return reply.status(403).send({
                    error: 'MFA_REQUIRED',
                    redirectTo: '/mfa-configure',
                    userId: existingUser.id,
                    message: 'Veuillez finaliser la configuration MFA',
                });
            } else {
                console.log(
                    '[DB] Conflit: Utilisateur existe déjà. ID:',
                    existingUser.id
                );
                return reply.status(409).send({
                    error: "Un compte avec cet email ou nom d'utilisateur existe déjà",
                });
            }
        }

        console.log('[AUTH] Hashage du mot de passe...');
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        console.log('[AUTH] Mot de passe hashé avec succès');

        const avatarValue =
            typeof avatar === 'string' && avatar.trim() !== '' ? avatar : null;
        console.log('[DB] Préparation insertion utilisateur:', {
            username,
            email,
            mfa_enabled: 0,
            google_account: 0,
            avatar: avatarValue,
        });

        const result = db
            .prepare(
                `
                INSERT INTO users (username, email, password, mfa_enabled, google_account, avatar)
                VALUES (?, ?, ?, ?, ?, ?)
            `
            )
            .run(username, email, hashedPassword, 0, 0, avatarValue);

        console.log('[DB] Insertion réussie. ID:', result.lastInsertRowid);

        // Récupération des données créées
        const newUser = db
            .prepare(
                'SELECT id, mfa_enabled FROM users WHERE username = ?'
            )
            .get(username);

        console.log("nouvel utilisateur " , newUser);

        if (newUser && newUser.mfa_enabled === 0) {
            // 🔁 Utilisateur partiellement inscrit : MFA non activé
            return reply.status(403).send({
                error: 'MFA_REQUIRED',
                message:
                    "Votre compte a bien été créé mais vous devez activer l'authentification à deux facteurs pour continuer.",
                userId: newUser.id,
                redirectTo: `/mfa-configure`,
            });
        } else {
            // ❌ Compte déjà complètement créé
            return reply.status(409).send({
                error: "Un compte avec cet email ou nom d'utilisateur existe déjà.",
            });
        }
    } catch (err) {
        console.error('[ERREUR] Détails:', {
            message: err.message,
            stack: err.stack,
            body: request.body,
            timestamp: new Date().toISOString(),
        });

        return reply.status(500).send({
            error: "Erreur lors de l'inscription",
            ...(process.env.NODE_ENV === 'development' && {
                details: err.message,
            }),
        });
    }
});

app.post('/auth/google-signup', async (req, reply) => {
    const { idToken } = req.body;

    if (!idToken) {
        return reply.status(400).send({ error: 'Token manquant' });
    }

    try {
        // 1. Vérification basique du token (sans audience)
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID, // Optionnel pour l'inscription
        });
        const payload = ticket.getPayload();

        // 2. Extraction des données nécessaires
        const { email, name, sub: googleId, picture: avatar } = payload;

        // 3. Vérification si l'email existe déjà

        // 2. Vérification de l'utilisateur en BDD
        console.log('[DB] Exécution de la requête SELECT...');
        const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
        const existingUser = stmt.get(email);

        console.log(
            '[DB] Résultat de la requête:',
            existingUser || 'Aucun utilisateur trouvé'
        );

        if (!existingUser) {
            const result = db
                .prepare(
                    `
            INSERT INTO users (username, email, password, mfa_enabled, google_account, avatar)
            VALUES (?, ?, ?, ?, ?, ?)
        `
                )
                .run(name, email, '', 0, 1, avatar);

            console.log(
                `Nouvel utilisateur inséré avec l'ID: ${result.lastInsertRowid}`
            );
        }

        if (existingUser && existingUser.mfa_enabled === 0) {
            return reply.status(403).send({
                // Code 403 plus approprié
                error: 'MFA_REQUIRED',
                redirectTo: '/mfa-configure',
                userId: existingUser.id,
                message: 'Veuillez configurer le MFA',
            });
        }
        return reply.send(200);
    } catch (err) {
        console.error('Erreur inscription Google:', err);
        return reply.status(400).send({
            error: "Échec de l'inscription Google",
            details: err.message,
        });
    }
});
// Démarrer le serveur
const start = async () => {
    try {
        await app.listen({
            port: 3000,
            host: '0.0.0.0',
        });
        console.log('Server running on http://localhost:3000');
    } catch (err) {
        console.error('Erreur démarrage:', err);
        process.exit(1);
    }
};

start();
