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
        const { userId } = request.body;

        console.log(userId);

        const user = db
            .prepare('SELECT id, mfa_temp_secret FROM users WHERE id = ?')
            .get(userId);

        console.log('user', user);
        if (!user) {
            return reply.status(404).send({ error: 'Utilisateur introuvable' });
        }

        if (!user.mfa_temp_secret) {
            return reply.status(400).send({
                error: 'Aucun secret temporaire trouvé pour cet utilisateur',
            });
        }

        // 3️⃣ Créer l’objet TOTP
        const totp = new TOTP({
            issuer: 'transcendence',
            label: user.email || 'user@example.com',
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: user.mfa_temp_secret,
        });

        // 4️⃣ Générer l’URL otpauth et le QR code
        const otpauthUrl = totp.toString();
        const qrCodeUrl = await qrcode.toDataURL(otpauthUrl);

        // 5️⃣ Retourner uniquement ce qui est nécessaire
        return reply.send({
            qrCodeUrl,
            otpauthUrl,
        });
    } catch (err) {
        console.error('Erreur setupMfa:', err);
        return reply.status(500).send({
            error: 'Erreur interne lors de la configuration MFA',
            details:
                process.env.NODE_ENV === 'development'
                    ? err.message
                    : undefined,
        });
    }
};

export const verifyMfaToken = async (request, reply) => {
    const { userId, mfaCode } = request.body;

    try {
        const user = db
            .prepare('SELECT email, mfa_temp_secret FROM users WHERE id = ?')
            .get(userId);

        const totp = new TOTP({
            secret: user.mfa_temp_secret,
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
        });

        const serverCode = totp.generate();
        const currentTime = Math.floor(Date.now() / 1000);

        console.log('🔍 Debug MFA:');
        console.log('- Code utilisateur:', mfaCode);
        console.log('- Code serveur:', serverCode);
        console.log('- Timestamp:', currentTime);
        console.log('- Secret:', user.mfa_temp_secret);

        const isValid = totp.validate({ token: mfaCode, window: 3 });

        if (isValid === 0) {
            db.prepare('UPDATE users SET mfa_enabled = 0 WHERE id = ?').run(
                userId
            );

            const userUpdated = db
                .prepare('SELECT * FROM users WHERE id = ?')
                .get(userId);

            //console.log('user updated ', userUpdated);
        }

        const jwt = generateJWT(
            user.id,
            user.email
        );
        return reply.status(200).send({
            jwtToken : jwt,
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
