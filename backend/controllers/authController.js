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
                'SELECT id, username, email, mfa_secret FROM users WHERE email = ? OR username = ?'
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
        let avatarName = ''; // valeur par défaut si pas d'avatar

        if (avatar && Buffer.isBuffer(avatar) && avatar.length > 0) {
            // Le buffer contient des données
            const buffer = avatar;
            const format = detectImageFormat(buffer);

            if (!format) {
                return reply.status(400).send({
                    error: 'Format de fichier non supporté (PNG ou JPEG requis)',
                });
            }

            avatarName = `${username}.${format === 'png' ? 'png' : 'jpg'}`;
            const uploadDir = path.join(process.cwd(), 'uploads');

            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const filePath = path.join(uploadDir, avatarName);
            fs.writeFileSync(filePath, buffer);
            console.log(`✅ Fichier sauvegardé : ${filePath}`);
        } else {
            // Pas d'avatar envoyé ou buffer vide
            console.log(
                'Aucun avatar envoyé ou buffer vide, utilisation de l’avatar par défaut'
            );
        }

        // Insertion en BDD
        const result = db
            .prepare(
                'INSERT INTO users (username, email, password, mfa_secret, google_account, avatar) VALUES (?, ?, ?, ?, ?, ?)'
            )
            .run(username, email, hashedPassword, '', 0, avatarName);
        const newUser = db
            .prepare('SELECT id FROM users WHERE username = ?')
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

            db.prepare('UPDATE users SET mfa_secret = ? WHERE id = ?').run(
                totp.secret.base32,
                newUser.id
            );
            const token = generateMfaSessionToken(newUser.id);
            reply.setCookie('mfa_session', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
                path: '/',
                maxAge: 10 * 60,
            });

            console.log('Nouvel utilisateur enregistrer ', newUser);
            return reply.status(403).send({
                error: 'MFA_REQUIRED',
                redirectTo: '/mfa-configure',
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
const generateMfaSessionToken = (userId) => {
    return jwt.sign({ userId, mfa_required: true }, process.env.JWT_SECRET, {
        expiresIn: '10m',
    });
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

        // Vérifier si l'utilisateur existe
        let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if(user)
        {
            if (user.email === email && user.google_account === 0) {
                return reply.status(400).send({
                    error: 'Un compte existe deja avec ce mail !',
                });
            }
        }
        // Utilisateur existant
        if (user) {
            // Assurer que le MFA secret existe
            if (!user.mfa_secret) {
                const secret = new Secret();
                const totp = new TOTP({
                    issuer: 'transcendence',
                    label: email,
                    algorithm: 'SHA1',
                    digits: 6,
                    period: 30,
                    secret,
                });
                db.prepare('UPDATE users SET mfa_secret = ? WHERE id = ?').run(
                    totp.secret.base32,
                    user.id
                );
                user.mfa_secret = totp.secret.base32;
            }

            // Créer le cookie MFA session
            const token = generateMfaSessionToken(user.id);
            reply.setCookie('mfa_session', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
                path: '/',
                maxAge: 10 * 60,
            });

            return reply.status(403).send({
                error: 'MFA_REQUIRED',
                redirectTo: '/mfa-configure',
                message: 'Veuillez entrer votre code MFA',
            });
        }

        // Nouvel utilisateur
        const secret = new Secret();
        const totp = new TOTP({
            issuer: 'transcendence',
            label: email,
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret,
        });

        // Créer l'utilisateur avec MFA secret déjà défini
        const result = db
            .prepare(
                'INSERT INTO users (username, email, password, mfa_secret, google_account, jwt_token, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)'
            )
            .run(name, email, '', totp.secret.base32, 1, '', '');

        user = db
            .prepare('SELECT * FROM users WHERE id = ?')
            .get(result.lastInsertRowid);

        // Créer le cookie MFA session
        const token = generateMfaSessionToken(user.id);
        reply.setCookie('mfa_session', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            path: '/',
            maxAge: 10 * 60,
        });

        return reply.status(403).send({
            error: 'MFA_REQUIRED',
            redirectTo: '/mfa-configure',
            message: 'Compte créé via Google, veuillez configurer le MFA',
        });
    } catch (err) {
        console.error('Erreur Google Signup:', err);
        return reply.status(500).send({
            error: 'Erreur lors de l’inscription via Google',
            details:
                process.env.NODE_ENV === 'development'
                    ? err.message
                    : undefined,
        });
    }
};

export const validateToken = async (req, reply) => {
    const token = req.cookies.token_user_authenticated;
    if (!token) {
        return reply
            .status(401)
            .send({ error: 'Cookie token_user_authenticated' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        return reply.send({
            valid: true,
            user: decoded,
            source: 'mfa_session',
        });
    } catch (err) {
        console.error('JWT Error:', err.message);
        return reply.status(401).send({
            error: 'Token mfa_session invalide',
            details: err.message,
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
                'SELECT id, username, email, password, mfa_secret FROM users WHERE email = ?'
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

        if (user) {
            const mfaSecret = user.mfa_secret;
            if (!mfaSecret) {
                console.log(
                    `${colors.bgYellow}${colors.black}[LOGIN WARNING]${colors.reset} L'utilisateur n'a pas de MFA configuré`
                );
            }

            // Créer le cookie MFA session
            const token = generateMfaSessionToken(user.id);
            reply.setCookie('mfa_session', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
                path: '/',
                maxAge: 10 * 60,
            });

            return reply.status(403).send({
                error: 'MFA_REQUIRED',
                redirectTo: '/mfa-configure',
                message: 'Veuillez entrer votre code MFA',
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
            error: 'Erreur lors de la connexion',
            ...(process.env.NODE_ENV === 'development' && {
                details: err.message,
            }),
        });
    }
};

export const logout = async (req, reply) => {
    try {
        // On efface les cookies d'authentification
        reply
            .clearCookie('token_user_authenticated', {
                path: '/',
                sameSite: 'None',
                secure: true,
                httpOnly: true,
            })
            .clearCookie('mfa_session', {
                path: '/',
                sameSite: 'None',
                secure: true,
                httpOnly: true,
            })
            .status(200)
            .send({ success: true, message: 'Déconnexion réussie' });
    } catch (err) {
        console.error('Erreur logout:', err);
        return reply.status(500).send({
            error: 'Erreur lors de la déconnexion',
            details:
                process.env.NODE_ENV === 'development'
                    ? err.message
                    : undefined,
        });
    }
};
