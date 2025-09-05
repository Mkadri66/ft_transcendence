import fs from 'fs';
import path from 'path';
import db from '../config/db.js';

export const deleteAccount = async (app) => {
    app.delete(
        '/delete-account',
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            try {
                const userPayload = request.user;
                console.log('PAYLOAD DELETE', userPayload);
                if (!userPayload || !userPayload.userId) {
                    return reply
                        .status(401)
                        .send({ error: 'Utilisateur non authentifié' });
                }

                // Récupérer l'utilisateur en BDD
                const user = db
                    .prepare(
                        'SELECT id, username, avatar FROM users WHERE id = ?'
                    )
                    .get(userPayload.userId);

                console.log('USER TO DELETE', user);

                if (!user) {
                    return reply
                        .status(404)
                        .send({ error: 'Utilisateur non trouvé' });
                }
                // Supprimer stats
                db.prepare('DELETE FROM user_stats WHERE user_id = ?').run(
                    user.id
                );

                // Supprimer participations aux games
                db.prepare('DELETE FROM game_players WHERE user_id = ?').run(
                    user.id
                );

                // Supprimer les games où il est gagnant
                db.prepare(
                    'UPDATE games SET winner_id = NULL WHERE winner_id = ?'
                ).run(user.id);

                // Supprimer ses relations d’amis
                db.prepare(
                    'DELETE FROM friends WHERE user_id = ? OR friend_id = ?'
                ).run([user.id, user.id]);

                db.prepare('DELETE FROM users WHERE id = ?').run(user.id);

                if (user.avatar) {
                    const avatarPath = path.join(
                        process.cwd(),
                        'uploads',
                        user.avatar
                    );
                    if (fs.existsSync(avatarPath)) {
                        fs.unlinkSync(avatarPath);
                    }
                }
                const allUsers = db
                    .prepare('SELECT id, username, email FROM users')
                    .all();
                console.log('Utilisateurs restants en BDD:', allUsers);
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
                return reply.send({ message: 'Compte supprimé avec succès' });
            } catch (err) {
                console.error('Erreur suppression compte:', err);
                return reply
                    .status(500)
                    .send({ error: 'Impossible de supprimer le compte' });
            }
        }
    );
};

export default deleteAccount;
