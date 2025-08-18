import bcrypt from 'bcrypt';
import db from '../config/db.js';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { Secret, TOTP } from 'otpauth';
import fastifyMultipart from '@fastify/multipart';
import fs from 'fs';
import path from 'path';

const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/auth/google/callback'
);

function detectImageFormat(buffer) {
    if (!Buffer.isBuffer(buffer)) return null;

    // PNG : 89 50 4E 47
    if (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
    ) {
        return 'png';
    }

    // JPEG : FF D8 FF E0 / FF D8 FF E1 / FF D8 FF DB
    if (
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff &&
        [0xe0, 0xe1, 0xdb].includes(buffer[3])
    ) {
        return 'jpeg';
    }

    return null; // format inconnu
}

// Couleurs ANSI pour les logs
export const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    underscore: '\x1b[4m',
    blink: '\x1b[5m',
    reverse: '\x1b[7m',
    hidden: '\x1b[8m',

    // Couleurs de texte
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',

    // Couleurs de fond
    bgBlack: '\x1b[40m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m',
};

export const register = async (request, reply) => {
    const { username, email, password, confirm_password, avatar } =
        request.body;

    if (password != confirm_password) {
        return reply.status(400).send({
            error: 'Les mots de passe ne correspondent pas',
        });
    }

    const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        return reply.status(400).send({
            error: 'Le mot de passe doit contenir : 8+ caractères, 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial (@$!%*?&)',
        });
    }

    try {
        const existingUser = db
            .prepare(
                'SELECT id, username, email, mfa_enabled, mfa_temp_secret FROM users WHERE email = ? OR username = ?'
            )
            .get(email, username);
        if (existingUser) {
            if (existingUser.email === email) {
                return reply.status(400).send({
                    error: 'Un compte existe deja avec ce mail !',
                });
            } else if (existingUser.username === username) {
                return reply.status(400).send({
                    error: 'Le pseudo a deja ete pris !',
                });
            }
        }
        // Password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Avatar

        const buffer = Buffer.isBuffer(avatar)
            ? avatar
            : Buffer.from(avatar.data);

        const format = detectImageFormat(buffer);
        if (!format) {
            return reply.status(400).send({
                error: 'Format de fichier non supporté (PNG ou JPEG requis)',
            });
        }

        const avatarName = `${username}.${format === 'png' ? 'png' : 'jpg'}`;
        const uploadDir = path.join(process.cwd(), 'uploads');

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, avatarName);
        fs.writeFileSync(filePath, buffer);

        console.log(`✅ Fichier sauvegardé : ${filePath}`);

        // Insertion en BDD
        const result = db
            .prepare(
                'INSERT INTO users (username, email, password, mfa_enabled, mfa_temp_secret,  google_account, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)'
            )
            .run(username, email, hashedPassword, 0, '', 0, avatarName);

        const lastUser = db
            .prepare('SELECT * FROM users WHERE username = ?')
            .get(username);
        console.log('last user', lastUser);
        const newUser = db
            .prepare('SELECT id, mfa_enabled FROM users WHERE username = ?')
            .get(username);

        if (newUser) {
            const secret = new Secret();
            const totp = new TOTP({
                issuer: 'transcendence',
                label: email,
                algorithm: 'SHA1',
                digits: 6,
                period: 30,
                secret: secret,
            });

            db.prepare('UPDATE users SET mfa_temp_secret = ? WHERE id = ?').run(
                totp.secret.base32,
                newUser.id
            );

            console.log('Nouvel utilisateur enregistrer ', newUser);
            return reply.status(403).send({
                error: 'MFA_REQUIRED',
                redirectTo: '/mfa-configure',
                userId: newUser.id,
                message: 'Vérifier votre compte avant de continuer',
            });
        }
    } catch (err) {
        console.error(
            `${colors.bgRed}${colors.white}[ERREUR CRITIQUE]${colors.reset} Détails:`,
            {
                message: err.message,
                stack: err.stack,
                body: request.body,
                timestamp: new Date().toISOString(),
            }
        );

        return reply.status(500).send({
            error: "Erreur lors de l'inscription",
            ...(process.env.NODE_ENV === 'development' && {
                details: err.message,
            }),
        });
    }
};
export const googleSignup = async (req, reply) => {
    const { idToken } = req.body;
    if (!idToken) {
        return reply.status(400).send({ error: 'Token manquant' });
    }

    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const { email, name, picture: avatar } = ticket.getPayload();

        // Vérification de l'existence de l'utilisateur
        const existingUser = db
            .prepare(
                'SELECT id, email, mfa_enabled , google_account FROM users WHERE email = ?'
            )
            .get(email);
        console.log('existing user : ', existingUser);

        if (
            existingUser &&
            email == existingUser.email &&
            existingUser.google_account == 1
        ) {
            console.log('Vérifier votre compte avant de continuer');
            return reply.status(403).send({
                error: 'MFA_REQUIRED',
                redirectTo: '/mfa-configure',
                userId: existingUser.id,
                message: 'Vérifier votre compte avant de continuer',
            });
        }

        try {
            const result = db
                .prepare(
                    'INSERT INTO users (username, email, password, mfa_enabled, mfa_secret, mfa_temp_secret, google_account, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
                )
                .run(name, email, '', 0, '', '', 1, avatar);

            const newUser = db
                .prepare(
                    'SELECT id, email, mfa_enabled FROM users WHERE id = ?'
                )
                .get(result.lastInsertRowid);

            if (!newUser) {
                throw new Error("Échec de la création de l'utilisateur");
            }

            const secret = new Secret();
            const totp = new TOTP({
                issuer: 'transcendence',
                label: email,
                algorithm: 'SHA1',
                digits: 6,
                period: 30,
                secret: secret,
            });

            db.prepare('UPDATE users SET mfa_temp_secret = ? WHERE id = ?').run(
                totp.secret.base32,
                newUser.id
            );

            console.log('Compte créé via Google, veuillez configurer le MFA');
            return reply.status(403).send({
                error: 'MFA_REQUIRED',
                redirectTo: '/mfa-configure',
                userId: newUser.id,
                message: 'Compte créé via Google, veuillez configurer le MFA',
            });
        } catch (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return reply.status(409).send({
                    error: 'Un compte existe déjà avec cet email',
                });
            }
            return reply.status(500).send({
                error: 'Erreur lors de la création du compte',
                details:
                    process.env.NODE_ENV === 'development'
                        ? err.message
                        : undefined,
            });
        }
    } catch (err) {
        return reply.status(400).send({
            error: "Échec de l'inscription Google",
            details: err.message,
        });
    }
};

export const validateToken = async (req, reply) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply
            .status(401)
            .send({ error: 'Authorization header manquant ou mal formaté' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return reply.send({ valid: true, user: decoded });
    } catch (err) {
        console.error('JWT Error:', err.message);
        return reply.status(401).send({
            error: 'Token invalide',
            details: err.message, // Ajout pour le débogage
        });
    }
};

export const login = async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
        return reply.status(400).send({
            error: 'Email et mot de passe requis',
        });
    }

    try {
        const user = db
            .prepare(
                'SELECT id, username, email, password, mfa_enabled, mfa_temp_secret FROM users WHERE email = ?'
            )
            .get(email);

        if (!user) {
            console.log(
                `${colors.bgRed}${colors.white}[LOGIN FAIL]${colors.reset} Utilisateur non trouvé`
            );
            return reply.status(401).send({
                error: 'Identifiants invalides',
            });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            console.log(
                `${colors.bgRed}${colors.white}[LOGIN FAIL]${colors.reset} Mot de passe incorrect`
            );
            return reply.status(401).send({
                error: 'Identifiants invalides',
            });
        }
        console.log(user);
        return reply.status(403).send({
            error: 'MFA_REQUIRED',
            redirectTo: '/mfa-configure',
            userId: user.id,
            message: 'Veuillez entrer votre code MFA',
        });
    } catch (err) {
        console.error(
            `${colors.bgRed}${colors.white}[ERREUR CRITIQUE]${colors.reset} Détails:`,
            {
                message: err.message,
                stack: err.stack,
                body: request.body,
                timestamp: new Date().toISOString(),
            }
        );

        return reply.status(500).send({
            error: 'Erreur lors de la connexion',
            ...(process.env.NODE_ENV === 'development' && {
                details: err.message,
            }),
        });
    }
};
