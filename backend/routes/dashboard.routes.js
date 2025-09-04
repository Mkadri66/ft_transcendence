import db from '../config/db.js';
import jwt from 'jsonwebtoken';

export default async function dashboardRoute(app) {
    app.get(
        '/dashboard',
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            try {
                // Vérifier le JWT
                const payload = request.user;
                
                const user = db
                    .prepare('SELECT id FROM users WHERE email = ?')
                    .get(payload.email);

                if (!user) {
                    return reply
                        .status(404)
                        .send({ error: 'Utilisateur introuvable' });
                }

                const userId = user.id;
                // Dernières parties (5) avec résultat calculé
                const lastGames = db
                    .prepare(
                        `
                    SELECT g.id, g.game_name,
                           CASE WHEN g.winner_id = ? THEN 'Victoire' ELSE 'Défaite' END AS result
                    FROM games g
                    INNER JOIN game_players gp ON gp.game_id = g.id
                    WHERE gp.user_id = ?
                    ORDER BY g.start_time DESC
                    LIMIT 5
                `
                    )
                    .all(userId, userId);

                // Ratio tournois
                const stats = db
                    .prepare(
                        `SELECT wins, losses FROM user_stats WHERE user_id = ?`
                    )
                    .get(userId) || { wins: 0, losses: 0 };

                // Amis récents
                const recentFriends = db
                    .prepare(
                        `
                    SELECT u.id, u.username
                    FROM friends f
                    JOIN users u ON u.id = f.friend_id
                    WHERE f.user_id = ?
                    ORDER BY f.created_at DESC
                    LIMIT 5
                `
                    )
                    .all(userId);

                const userCount = db
                    .prepare(
                        'SELECT COUNT(*) as count FROM users WHERE id != ?'
                    )
                    .get(userId);
                // Suggestions d'amis (5 utilisateurs non amis)
                const suggestedFriends = db
                    .prepare(
                        `
        SELECT u.id, u.username, u.avatar,
               (SELECT COUNT(*) FROM friends f1 
                WHERE f1.user_id IN (SELECT friend_id FROM friends WHERE user_id = ?)
                AND f1.friend_id = u.id) as mutual_friends
        FROM users u
        WHERE u.id != ? 
            AND u.id NOT IN (
                SELECT friend_id FROM friends WHERE user_id = ?
                UNION
                SELECT user_id FROM friends WHERE friend_id = ?
            )
        ORDER BY mutual_friends DESC, u.username
        LIMIT 5
    `
                    )
                    .all(userId, userId, userId, userId);


                // Vérifiez toutes les relations d'amitié
                const allFriends = db.prepare('SELECT * FROM friends').all();

                // Vérifiez les amis de l'utilisateur courant
                const userFriends = db
                    .prepare(
                        `
    SELECT u.id, u.username 
    FROM friends f 
    JOIN users u ON (f.friend_id = u.id OR f.user_id = u.id) 
    WHERE (f.user_id = ? OR f.friend_id = ?) 
    AND u.id != ?
`
                    )
                    .all(userId, userId, userId);

                // Retourner les données
                return reply.status(200).send({
                    lastGames,
                    ratio: stats,
                    recentFriends,
                    suggestedFriends,
                });
            } catch (err) {
                console.error('Erreur /dashboard/:', err);
                return reply.status(500).send({ error: 'Erreur serveur' });
            }
        }
    );
}
