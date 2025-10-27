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
                    SELECT 
                        g.id, 
                        g.game_name,
                        gp.score AS my_score,
                        (SELECT COALESCE(u2.username, gp2.player_alias) 
                         FROM game_players gp2 
                         LEFT JOIN users u2 ON gp2.user_id = u2.id
                         WHERE gp2.game_id = g.id AND gp2.id != gp.id
                         LIMIT 1) AS opponent_name,
                        (SELECT gp2.score 
                         FROM game_players gp2 
                         WHERE gp2.game_id = g.id AND gp2.id != gp.id
                         LIMIT 1) AS opponent_score,
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

                // Amis récents avec WITH pour ORDER BY correct
                const recentFriends = db
                    .prepare(
                        `
                    WITH friend_list AS (
                        SELECT friend_id as friend_id, created_at
                        FROM friends
                        WHERE user_id = ?
                        
                        UNION ALL
                        
                        SELECT user_id as friend_id, created_at
                        FROM friends
                        WHERE friend_id = ?
                    )
                    SELECT DISTINCT u.id, u.username, u.avatar
                    FROM friend_list f
                    JOIN users u ON u.id = f.friend_id
                    ORDER BY f.created_at DESC
                    LIMIT 5
                `
                    )
                    .all(userId, userId);

                // Suggestions d'amis (5 utilisateurs non amis)
                const suggestedFriends = db
                    .prepare(
                        `
                    SELECT u.id, u.username, u.avatar
                    FROM users u
                    WHERE u.id != ?
                        AND u.id NOT IN (
                            SELECT friend_id FROM friends WHERE user_id = ?
                            UNION
                            SELECT user_id FROM friends WHERE friend_id = ?
                            UNION
                            SELECT blocked_user_id FROM blocked_users WHERE user_id = ?
                        )
                    ORDER BY u.username
                    LIMIT 5
                `
                    )
                    .all(userId, userId, userId, userId);

                // Utilisateurs bloqués
                const blockedUsers = db
                    .prepare(
                        `
                    SELECT u.id, u.username, u.avatar
                    FROM users u
                    JOIN blocked_users b ON b.blocked_user_id = u.id
                    WHERE b.user_id = ?
                    ORDER BY b.created_at DESC
                    LIMIT 5
                `
                    )
                    .all(userId);

                // Retourner les données
                return reply.status(200).send({
                    lastGames,
                    ratio: stats,
                    recentFriends,
                    suggestedFriends,
                    blockedUsers,
                });
            } catch (err) {
                console.error('Erreur /dashboard:', err);
                return reply.status(500).send({ error: 'Erreur serveur' });
            }
        }
    );
}
