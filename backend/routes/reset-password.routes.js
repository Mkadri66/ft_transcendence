import bcrypt from 'bcrypt';
import db from '../config/db.js';

export default async function resetPassword(app) {
    app.patch('/reset-password', async (request, reply) => {
        try {
            // Vérifier l'authentification
            const token = request.headers.authorization?.split(' ')[1];
            if (!token) {
                return reply.status(401).send({ error: 'Token manquant' });
            }

            // Récupérer l'utilisateur
            const user = db
                .prepare('SELECT id, password FROM users WHERE jwt_token = ?')
                .get(token);

            if (!user) {
                return reply
                    .status(404)
                    .send({ error: 'Utilisateur non trouvé' });
            }

            const { currentPassword, newPassword, confirmPassword } =
                request.body;

            if (!currentPassword || !newPassword || !confirmPassword) {
                return reply.status(400).send({ error: 'Champs manquants' });
            }

            if (newPassword !== confirmPassword) {
                return reply
                    .status(400)
                    .send({ error: 'Les mots de passe ne correspondent pas' });
            }

            // Vérifier l'ancien mot de passe
            const isValid = await bcrypt.compare(
                currentPassword,
                user.password
            );
            if (!isValid) {
                return reply
                    .status(400)
                    .send({ error: 'Ancien mot de passe incorrect' });
            }

            const passwordRegex =
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!passwordRegex.test(newPassword) || !passwordRegex.test(confirmPassword)) {
                return reply.status(400).send({
                    error: 'Le mot de passe doit contenir : 8+ caractères, 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial (@$!%*?&)',
                });
            }
            // Hacher le nouveau mot de passe
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Mettre à jour en base
            db.prepare('UPDATE users SET password = ? WHERE id = ?').run(
                hashedPassword,
                user.id
            );

            return reply.status(200).send({
                message: 'Mot de passe mis à jour avec succès',
            });
        } catch (err) {
            console.error('Erreur reset-password:', err);
            return reply.status(500).send({ error: 'Erreur serveur' });
        }
    });
}
