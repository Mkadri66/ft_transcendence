import bcrypt from 'bcrypt';
import db from '../config/db.js';
import { Secret, TOTP } from 'otpauth';
import qrcode from 'qrcode';

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
            db.prepare('UPDATE users SET mfa_enabled = 1 WHERE id = ?').run(
                userId
            );

            const userUpdated = db
                .prepare('SELECT * FROM users WHERE id = ?')
                .get(userId);

            console.log('user updated ', userUpdated);
        }
        return reply.status(200).send({
            success: true,
            message: 'MFA configuré avec succès'
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

export const validateMfaLogin = async (request, reply) => {
    console.log(
        `${colors.bgBlue}${colors.white}[MFA LOGIN]${colors.reset} Validation MFA pour la connexion`
    );

    const { userId, token } = request.body;

    try {
        // Récupérer l'utilisateur et son secret MFA
        const user = db
            .prepare('SELECT id, mfa_secret FROM users WHERE id = ?')
            .get(userId);

        if (!user || !user.mfa_secret) {
            console.log(
                `${colors.bgRed}${colors.white}[MFA ERROR]${colors.reset} Utilisateur ou secret MFA non trouvé`
            );
            return reply
                .status(404)
                .send({ error: 'Configuration MFA invalide' });
        }

        // Vérifier le token
        const verified = speakeasy.totp.verify({
            secret: user.mfa_secret,
            encoding: 'base32',
            token: token,
            window: 1,
        });

        if (!verified) {
            console.log(
                `${colors.bgRed}${colors.white}[MFA ERROR]${colors.reset} Token invalide pour la connexion de l'utilisateur ID: ${userId}`
            );
            return reply.status(400).send({ error: 'Code MFA invalide' });
        }

        console.log(
            `${colors.bgGreen}${colors.black}[MFA LOGIN SUCCESS]${colors.reset} Connexion MFA validée pour l'utilisateur ID: ${userId}`
        );

        return reply.send({
            success: true,
            userId: user.id,
            message: 'Authentification MFA réussie',
        });
    } catch (err) {
        console.error(
            `${colors.bgRed}${colors.white}[MFA ERROR]${colors.reset} Erreur critique:`,
            err
        );
        return reply.status(500).send({
            error: 'Erreur lors de la validation MFA',
            ...(process.env.NODE_ENV === 'development' && {
                details: err.message,
            }),
        });
    }
};
