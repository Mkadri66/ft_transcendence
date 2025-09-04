import bcrypt from 'bcrypt';
import db from '../config/db.js';
import { Secret, TOTP } from 'otpauth';
import qrcode from 'qrcode';
import jwt from 'jsonwebtoken';

const generateJWT = (userId, email) => {
    return jwt.sign(
        {
            userId,
            email,
            iat: Math.floor(Date.now() / 1000),
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
};

export const generateMfa = async (request, reply) => {
    try {
        const token = request.cookies['mfa_session'];
        if (!token) {
            return reply
                .status(401)
                .send({ error: 'Utilisateur non connecté' });
        }

        const sessionUser = jwt.verify(token, process.env.JWT_SECRET);
        if (!sessionUser)
            return reply.status(404).send({ error: 'Token JWT incorrect.' });

        const user = db
            .prepare('SELECT id, email, mfa_secret FROM users WHERE id = ?')
            .get(sessionUser.userId);

        if (!user || !user.mfa_secret) {
            return reply.status(404).send({
                error: 'Utilisateur introuvable ou aucun secret MFA trouvé',
            });
        }

        const totp = new TOTP({
            issuer: 'transcendence',
            label: user.email || 'user@example.com',
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: user.mfa_secret,
        });

        const otpauthUrl = totp.toString();
        const qrCodeUrl = await qrcode.toDataURL(otpauthUrl);

        return reply.send({
            qrCodeUrl,
            otpauthUrl,
        });
    } catch (err) {
        console.error('Erreur generateMfa:', err);
        return reply.status(500).send({
            error: 'Erreur interne lors de la génération MFA',
            details:
                process.env.NODE_ENV === 'development'
                    ? err.message
                    : undefined,
        });
    }
};

export const verifyMfaToken = async (request, reply) => {
    const { mfaCode } = request.body;

    const token = request.cookies['mfa_session'];
    if (!token) {
        return reply.status(401).send({ error: 'Utilisateur non connecté' });
    }
    const sessionUser = jwt.verify(token, process.env.JWT_SECRET);
    try {
        const user = db
            .prepare('SELECT id, email, mfa_secret FROM users WHERE id = ?')
            .get(sessionUser.userId);

        if (!user || !user.mfa_secret) {
            return reply.status(400).send({
                error: 'Utilisateur ou secret temporaire introuvable',
            });
        }

        const totp = new TOTP({
            secret: user.mfa_secret,
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
        });

        const expectedCode = totp.generate();
        console.log(
            `🔹 Code MFA attendu: ${expectedCode}, code reçu: ${mfaCode}`
        );

        const isValid = totp.validate({ token: mfaCode, window: 3 });
        console.log("IS VALID", isValid)
        if (isValid === null) {
            return reply.status(401).send({
                success: false,
                error: 'Code MFA invalide',
            });
        }

        // Générer le JWT
        const jwt = generateJWT(user.id, user.email);

        db.prepare('UPDATE users SET jwt_token = ? WHERE id = ?').run(
            jwt,
            sessionUser.userId
        );

        reply
            .clearCookie('mfa_session', {
                path: '/',
                sameSite: 'None',
                secure: true,
                httpOnly: true,
            })
            .setCookie('token_user_authenticated', jwt, {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
                path: '/',
                maxAge: 6000,
            })
            .status(200)
            .send({
                success: true,
                message: 'MFA configuré avec succès',
            });
    } catch (err) {
        console.error('❌ Erreur MFA:', err);
        return reply.status(500).send({
            error: 'Erreur interne du serveur',
            details:
                process.env.NODE_ENV === 'development'
                    ? err.message
                    : undefined,
        });
    }
};
