import bcrypt from 'bcrypt';
import db from '../config/db.js';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { Secret, TOTP } from 'otpauth';

const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/auth/google/callback'
);

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
    console.log(
        `${colors.bgBlue}${colors.white}[REGISTER]${colors.reset} Requête reçue. Corps:`,
        request.body
    );
    const { username, email, password, confirmPassword, avatar } = request.body;

    // Validation des données
    console.log(
        `${colors.bgMagenta}${colors.white}[VALIDATION]${colors.reset} Début validation des données`
    );
    if (password !== confirmPassword) {
        console.log(
            `${colors.bgRed}${colors.white}[VALIDATION ERREUR]${colors.reset} Les mots de passe ne correspondent pas`
        );
        return reply.status(400).send({
            error: 'Les mots de passe ne correspondent pas',
        });
    }

    const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        console.log(
            `${colors.bgRed}${colors.white}[VALIDATION ERREUR]${colors.reset} Mot de passe trop faible`
        );
        return reply.status(400).send({
            error: 'Le mot de passe doit contenir : 8+ caractères, 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial (@$!%*?&)',
        });
    }

    try {
        console.log(
            `${colors.bgCyan}${colors.black}[DATABASE]${colors.reset} Vérification des doublons pour:`,
            {
                email,
                username,
            }
        );
        const existingUser = db
            .prepare(
                'SELECT id, username, email, mfa_enabled, mfa_temp_secret FROM users WHERE email = ? OR username = ?'
            )
            .get(email, username);

        console.log(
            `${colors.bgCyan}${colors.black}[DATABASE RESULT]${colors.reset} Vérification doublons:`,
            existingUser || 'Aucun doublon trouvé'
        );

        if (existingUser) {
            if (existingUser.mfa_enabled === 0) {
                console.log(
                    `${colors.bgYellow}${colors.black}[MFA REQUIS]${colors.reset} Utilisateur existe mais MFA non configuré. ID:`,
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
                    `${colors.bgRed}${colors.white}[CONFLIT]${colors.reset} Utilisateur existe déjà. ID:`,
                    existingUser.id
                );
                return reply.status(409).send({
                    error: "Un compte avec cet email ou nom d'utilisateur existe déjà",
                });
            }
        }

        console.log(
            `${colors.bgGreen}${colors.black}[AUTH]${colors.reset} Hashage du mot de passe...`
        );
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        console.log(
            `${colors.bgGreen}${colors.black}[AUTH SUCCESS]${colors.reset} Mot de passe hashé avec succès`
        );

        const avatarValue =
            typeof avatar === 'string' && avatar.trim() !== '' ? avatar : null;
        console.log(
            `${colors.bgCyan}${colors.black}[DATABASE]${colors.reset} Préparation insertion utilisateur:`,
            {
                username,
                email,
                mfa_enabled: 0,
                google_account: 0,
                avatar: avatarValue,
            }
        );

        const result = db
            .prepare(
                'INSERT INTO users (username, email, password, mfa_enabled, fa_temp_secret,  google_account, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)'
            )
            .run(username, email, hashedPassword, 0, '', 0, avatarValue);

        console.log(
            `${colors.bgGreen}${colors.black}[DATABASE SUCCESS]${colors.reset} Insertion réussie. ID:`,
            result.lastInsertRowid
        );

        // Récupération des données créées
        const newUser = db
            .prepare('SELECT id, mfa_enabled FROM users WHERE username = ?')
            .get(username);

        console.log(
            `${colors.bgGreen}${colors.black}[NOUVEL UTILISATEUR]${colors.reset}`,
            newUser
        );

        if (newUser && newUser.mfa_enabled === 0) {
            return reply.status(403).send({
                error: 'MFA_REQUIRED',
                message:
                    "Votre compte a bien été créé mais vous devez activer l'authentification à deux facteurs pour continuer.",
                userId: newUser.id,
                redirectTo: `/mfa-configure`,
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
        const existingUser = db
            .prepare('SELECT id, email, mfa_enabled FROM users WHERE email = ?')
            .get(email);

        if (!existingUser) {
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

                if (newUser) {
                    const id = newUser.id;
                    const secret = new Secret();
                    const totp = new TOTP({
                        issuer: 'transcendence',
                        label: email,
                        algorithm: 'SHA1',
                        digits: 6,
                        period: 30,
                        secret: secret,
                    });

                    db.prepare(
                        'UPDATE users SET mfa_temp_secret = ? WHERE id = ?'
                    ).run(totp.secret.base32, id);

                    const result = db.prepare('SELECT * FROM users').all();
                    console.log("result", result);
                    return reply.status(403).send({
                        error: 'MFA_REQUIRED',
                        redirectTo: '/mfa-configure',
                        userId: newUser.id,
                        message:
                            'Compte créé via Google, veuillez configurer le MFA',
                    });
                }
            } catch (err) {
                return reply.status(500).send({
                    error: 'Erreur lors de la création du compte',
                    details:
                        process.env.NODE_ENV === 'development'
                            ? err.message
                            : undefined,
                });
            }
        }
        return reply.send(200);
    } catch (err) {
        return reply.status(400).send({
            error: "Échec de l'inscription Google",
            details: err.message,
        });
    }
};
