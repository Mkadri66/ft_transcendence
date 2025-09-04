import db from '../config/db.js';
import jwt from 'jsonwebtoken';

export default async function profileRoutes(app) {
    app.get(
        '/profile/:username',
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            try {
                const { username } = request.params;
                console.log("username profile", username)

                const user = db
                    .prepare(
                        'SELECT id, username, email, avatar, created_at FROM users WHERE username = ?'
                    )
                    .get(username);

                if (!user) {
                    return reply
                        .status(404)
                        .send({ error: 'Utilisateur non trouvé' });
                }

                // Stats de l’utilisateur
                const stats = db
                    .prepare(
                        `SELECT total_games, wins, losses, highest_score, last_played
                     FROM user_stats WHERE user_id = ?`
                    )
                    .get(user.id);

                // Nombre de tournois remportés
                const tournamentsWon = db
                    .prepare(
                        `SELECT COUNT(DISTINCT g.tournament_id) as total_tournaments_won
                     FROM games g
                     WHERE g.winner_id = ?`
                    )
                    .get(user.id);

                // Historique des matchs
                const history = db
                    .prepare(
                        `SELECT g.id as game_id, g.game_name, g.tournament_id, t.name as tournament_name,
                            g.start_time, g.end_time, g.winner_id,
                            CASE WHEN g.winner_id = ? THEN 1 ELSE 0 END as is_winner
                     FROM games g
                     JOIN tournaments t ON t.id = g.tournament_id
                     JOIN game_players gp ON gp.game_id = g.id
                     WHERE gp.user_id = ?
                     ORDER BY g.start_time DESC`
                    )
                    .all(user.id, user.id);

                return reply.send({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar || null,
                    createdAt: user.created_at,
                    stats: stats || {
                        total_games: 0,
                        wins: 0,
                        losses: 0,
                        highest_score: 0,
                    },
                    totalTournamentsWon:
                        tournamentsWon?.total_tournaments_won || 0,
                    history,
                });
            } catch (err) {
                console.error('Erreur route /profile/:username:', err);
                return reply.status(500).send({ error: 'Erreur serveur' });
            }
        }
    );

    app.get(
        '/friends/check/:username',
        { preHandler: [app.authenticate] },
        async (req, reply) => {
            try {
                const user = db
                    .prepare('SELECT id FROM users WHERE email = ?')
                    .get(req.user.email);
                if (!user)
                    return reply
                        .status(404)
                        .send({ error: 'Utilisateur introuvable' });

                const friend = db
                    .prepare('SELECT id FROM users WHERE username = ?')
                    .get(req.params.username);
                if (!friend)
                    return reply
                        .status(404)
                        .send({ error: 'Utilisateur introuvable' });

                const existing = db
                    .prepare(
                        `
                        SELECT * FROM friends 
                        WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
                    `
                    )
                    .get(user.id, friend.id, friend.id, user.id);

                return reply.send({ areFriends: !!existing });
            } catch (err) {
                console.error('Erreur /friends/check/:username', err);
                return reply.status(500).send({ error: 'Erreur serveur' });
            }
        }
    );

    app.post(
        '/friends/add',
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            try {
                const user = db
                    .prepare('SELECT id FROM users WHERE email = ?')
                    .get(request.user.email);
                const userId = user?.id;
                const friendUsername = request.body.username;

                if (!userId || !friendUsername)
                    return reply
                        .status(400)
                        .send({ error: 'Paramètres manquants' });

                const friend = db
                    .prepare('SELECT id FROM users WHERE username = ?')
                    .get(friendUsername);
                if (!friend)
                    return reply
                        .status(404)
                        .send({ error: 'Utilisateur introuvable' });

                const friendId = friend.id;

                const existing = db
                    .prepare(
                        `
                        SELECT * FROM friends 
                        WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
                    `
                    )
                    .get(userId, friendId, friendId, userId);

                if (existing)
                    return reply
                        .status(400)
                        .send({ error: 'Déjà en relation' });

                db.prepare(
                    'INSERT INTO friends (user_id, friend_id) VALUES (?, ?)'
                ).run(userId, friendId);

                return reply.send({ success: true, message: 'Ami ajouté' });
            } catch (err) {
                console.error('Erreur /friends/add', err);
                return reply.status(500).send({ error: 'Erreur serveur' });
            }
        }
    );
    app.delete(
        '/friends/remove',
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            try {
                const user = db
                    .prepare('SELECT id FROM users WHERE email = ?')
                    .get(request.user.email);
                const userId = user?.id;
                const friendUsername = request.body.username;

                if (!userId || !friendUsername)
                    return reply
                        .status(400)
                        .send({ error: 'Paramètres manquants' });

                const friend = db
                    .prepare('SELECT id FROM users WHERE username = ?')
                    .get(friendUsername);
                if (!friend)
                    return reply
                        .status(404)
                        .send({ error: 'Utilisateur introuvable' });

                const friendId = friend.id;

                const existing = db
                    .prepare(
                        `
                        SELECT * FROM friends 
                        WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
                    `
                    )
                    .get(userId, friendId, friendId, userId);

                if (!existing)
                    return reply
                        .status(400)
                        .send({ error: 'Pas d’amitié existante' });

                db.prepare(
                    `
                    DELETE FROM friends 
                    WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
                `
                ).run(userId, friendId, friendId, userId);

                return reply.send({ success: true, message: 'Ami supprimé' });
            } catch (err) {
                console.error('Erreur /friends/remove', err);
                return reply.status(500).send({ error: 'Erreur serveur' });
            }
        }
    );
}
