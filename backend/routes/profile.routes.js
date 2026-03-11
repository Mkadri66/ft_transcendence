import db from '../config/db.js';
import jwt from 'jsonwebtoken';
import { notifyFriendsUpdated } from './ws.routes.js';

export default async function profileRoutes(app) {
    app.get(
        '/profile/:username',
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            try {
                const { username } = request.params;

                // Récupérer l'utilisateur connecté depuis le payload JWT
                const payload = request.user;
                let currentUser = null;

                if (payload && payload.userId) {
                    currentUser = db
                        .prepare('SELECT id FROM users WHERE id = ?')
                        .get(payload.userId);
                } else if (payload && payload.email) {
                    currentUser = db
                        .prepare('SELECT id FROM users WHERE email = ?')
                        .get(payload.email);
                }

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

                // Vérifier si c'est le profil de l'utilisateur connecté
                const isOwnProfile = currentUser && currentUser.id === user.id;

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

                const friends = db
                    .prepare(
                        `
                        SELECT DISTINCT u.username,
                                        COALESCE(u.avatar, 'avatar.png') AS avatar
                        FROM friends f
                        JOIN users u ON u.id = CASE
                            WHEN f.user_id = ? THEN f.friend_id
                            ELSE f.user_id
                        END
                        WHERE f.user_id = ? OR f.friend_id = ?
                        ORDER BY u.username ASC
                    `
                    )
                    .all(user.id, user.id, user.id);

                console.log("friends", friends)
                return reply.send({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar || null,
                    createdAt: user.created_at,
                    isOwnProfile,
                    stats: stats || {
                        total_games: 0,
                        wins: 0,
                        losses: 0,
                        highest_score: 0,
                    },
                    totalTournamentsWon:
                        tournamentsWon?.total_tournaments_won || 0,
                    history,
                    friends,
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
                const payload = req.user;
                let user = null;

                if (payload && payload.userId) {
                    user = db
                        .prepare('SELECT id FROM users WHERE id = ?')
                        .get(payload.userId);
                } else if (payload && payload.email) {
                    user = db
                        .prepare('SELECT id FROM users WHERE email = ?')
                        .get(payload.email);
                }

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

                if (friend.id === user.id) {
                    return reply.send({ areFriends: false });
                }

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

    app.get(
        '/blocked/check/:username',
        { preHandler: [app.authenticate] },
        async (req, reply) => {
            try {
                const payload = req.user;
                let user = null;

                if (payload && payload.userId) {
                    user = db
                        .prepare('SELECT id FROM users WHERE id = ?')
                        .get(payload.userId);
                } else if (payload && payload.email) {
                    user = db
                        .prepare('SELECT id FROM users WHERE email = ?')
                        .get(payload.email);
                }

                if (!user)
                    return reply
                        .status(404)
                        .send({ error: 'Utilisateur introuvable' });

                const blockedUser = db
                    .prepare('SELECT id FROM users WHERE username = ?')
                    .get(req.params.username);
                if (!blockedUser)
                    return reply
                        .status(404)
                        .send({ error: 'Utilisateur introuvable' });

                const isBlocked = db
                    .prepare(
                        `SELECT * FROM blocked_users
                         WHERE user_id = ? AND blocked_user_id = ?`
                    )
                    .get(user.id, blockedUser.id);

                return reply.send({ isBlocked: !!isBlocked });
            } catch (err) {
                console.error('Erreur /blocked/check/:username', err);
                return reply.status(500).send({ error: 'Erreur serveur' });
            }
        }
    );
	app.get(
		'/friends/requests',
		{ preHandler: [app.authenticate] },
		async (request, reply) => {
		    const userId = request.user.userId;

		    const requests = db.prepare(`
		        SELECT u.username, u.avatar
		        FROM friend_requests fr
		        JOIN users u ON u.id = fr.sender_id
		        WHERE fr.receiver_id = ? AND fr.status = 'pending'
		    `).all(userId);

		    reply.send({ requests });
		}
	);

    app.post(
		'/friends/request',
		{ preHandler: [app.authenticate] },
		async (request, reply) => {
		    try {
		        const userId = request.user.userId;
		        const { username } = request.body;

		        const receiver = db.prepare(
		            'SELECT id FROM users WHERE username = ?'
		        ).get(username);

		        if (!receiver) return reply.status(404).send({ error: 'Utilisateur introuvable' });

		        if (receiver.id === userId)
		            return reply.status(400).send({ error: 'Action invalide' });

		        // vérifier blocage
		        const blocked = db.prepare(`
		            SELECT * FROM blocked_users
		            WHERE (user_id = ? AND blocked_user_id = ?)
		            OR (user_id = ? AND blocked_user_id = ?)
		        `).get(userId, receiver.id, receiver.id, userId);

		        if (blocked)
		            return reply.status(403).send({ error: 'Impossible d’envoyer une demande' });

		        // déjà amis ?
		        const existingFriend = db.prepare(`
		            SELECT * FROM friends
		            WHERE (user_id = ? AND friend_id = ?)
		            OR (user_id = ? AND friend_id = ?)
		        `).get(userId, receiver.id, receiver.id, userId);

		        if (existingFriend)
		            return reply.status(400).send({ error: 'Déjà amis' });

		        // déjà demande en attente ?
		        const existingRequest = db.prepare(`
		            SELECT * FROM friend_requests
		            WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'
		        `).get(userId, receiver.id);

		        if (existingRequest)
		            return reply.status(400).send({ error: 'Demande déjà envoyée' });

		        db.prepare(`
		            INSERT INTO friend_requests (sender_id, receiver_id)
		            VALUES (?, ?)
		        `).run(userId, receiver.id);

                notifyFriendsUpdated([userId, receiver.id], 'request');

		        return reply.send({ success: true, message: 'Demande envoyée' });

		    } catch (err) {
		        console.error(err);
		        return reply.status(500).send({ error: 'Erreur serveur' });
		    }
		}
	);
	app.post(
		'/friends/accept',
		{ preHandler: [app.authenticate] },
		async (request, reply) => {
		    try {
		        const userId = request.user.userId;
		        const { username } = request.body;

		        const sender = db.prepare(
		            'SELECT id FROM users WHERE username = ?'
		        ).get(username);

		        if (!sender)
		            return reply.status(404).send({ error: 'Utilisateur introuvable' });

		        const requestRow = db.prepare(`
		            SELECT * FROM friend_requests
		            WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'
		        `).get(sender.id, userId);

		        if (!requestRow)
		            return reply.status(400).send({ error: 'Demande introuvable' });

		        db.prepare(`
		            INSERT INTO friends (user_id, friend_id)
		            VALUES (?, ?)
		        `).run(sender.id, userId);

		        db.prepare(`
		            DELETE FROM friend_requests
		            WHERE id = ?
		        `).run(requestRow.id);

                notifyFriendsUpdated([userId, sender.id], 'accept');

		        return reply.send({ success: true });

		    } catch (err) {
		        console.error(err);
		        return reply.status(500).send({ error: 'Erreur serveur' });
		    }
		}
	);
	app.post(
		'/friends/reject',
		{ preHandler: [app.authenticate] },
		async (request, reply) => {
		    try {
		        const userId = request.user.userId;
		        const { username } = request.body;

		        const sender = db.prepare(
		            'SELECT id FROM users WHERE username = ?'
		        ).get(username);

		        if (!sender)
		            return reply.status(404).send({ error: 'Utilisateur introuvable' });

		        db.prepare(`
		            DELETE FROM friend_requests
		            WHERE sender_id = ? AND receiver_id = ?
		        `).run(sender.id, userId);

                notifyFriendsUpdated([userId, sender.id], 'reject');

		        return reply.send({ success: true });

		    } catch (err) {
		        console.error(err);
		        return reply.status(500).send({ error: 'Erreur serveur' });
		    }
		}
	);
    app.delete(
        '/friends/remove',
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            try {
                const payload = request.user;
                let user = null;

                if (payload && payload.userId) {
                    user = db
                        .prepare('SELECT id FROM users WHERE id = ?')
                        .get(payload.userId);
                } else if (payload && payload.email) {
                    user = db
                        .prepare('SELECT id FROM users WHERE email = ?')
                        .get(payload.email);
                }

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

                if (friendId === userId) {
                    return reply
                        .status(400)
                        .send({ error: 'Relation invalide' });
                }

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
                        .send({ error: "Pas d'amitié existante" });

                db.prepare(
                    `
                    DELETE FROM friends
                    WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
                `
                ).run(userId, friendId, friendId, userId);

				notifyFriendsUpdated([userId, friendId], 'remove');
                return reply.send({ success: true, message: 'Ami supprimé' });
            } catch (err) {
                console.error('Erreur /friends/remove', err);
                return reply.status(500).send({ error: 'Erreur serveur' });
            }
        }
    );
    app.post(
        '/blocked/add',
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            try {
                const payload = request.user;
                let user = null;

                if (payload && payload.userId) {
                    user = db
                        .prepare('SELECT id FROM users WHERE id = ?')
                        .get(payload.userId);
                } else if (payload && payload.email) {
                    user = db
                        .prepare('SELECT id FROM users WHERE email = ?')
                        .get(payload.email);
                }

                const userId = user?.id;
                const blockedUsername = request.body.username;

                if (!userId || !blockedUsername)
                    return reply
                        .status(400)
                        .send({ error: 'Paramètres manquants' });

                const blockedUser = db
                    .prepare('SELECT id FROM users WHERE username = ?')
                    .get(blockedUsername);
                if (!blockedUser)
                    return reply
                        .status(404)
                        .send({ error: 'Utilisateur introuvable' });

                const blockedUserId = blockedUser.id;

                if (userId === blockedUserId)
                    return reply
                        .status(400)
                        .send({ error: 'Vous ne pouvez pas vous bloquer' });

                const existing = db
                    .prepare(
                        `SELECT * FROM blocked_users
                         WHERE user_id = ? AND blocked_user_id = ?`
                    )
                    .get(userId, blockedUserId);

                if (existing)
                    return reply
                        .status(400)
                        .send({ error: 'Utilisateur déjà bloqué' });

                db.prepare(
                    'INSERT INTO blocked_users (user_id, blocked_user_id) VALUES (?, ?)'
                ).run(userId, blockedUserId);

                return reply.send({
                    success: true,
                    message: 'Utilisateur bloqué',
                });
            } catch (err) {
                console.error('Erreur /blocked/add', err);
                return reply.status(500).send({ error: 'Erreur serveur' });
            }
        }
    );

    app.delete(
        '/blocked/remove',
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            try {
                const payload = request.user;
                let user = null;

                if (payload && payload.userId) {
                    user = db
                        .prepare('SELECT id FROM users WHERE id = ?')
                        .get(payload.userId);
                } else if (payload && payload.email) {
                    user = db
                        .prepare('SELECT id FROM users WHERE email = ?')
                        .get(payload.email);
                }

                const userId = user?.id;
                const blockedUsername = request.body.username;

                if (!userId || !blockedUsername)
                    return reply
                        .status(400)
                        .send({ error: 'Paramètres manquants' });

                const blockedUser = db
                    .prepare('SELECT id FROM users WHERE username = ?')
                    .get(blockedUsername);
                if (!blockedUser)
                    return reply
                        .status(404)
                        .send({ error: 'Utilisateur introuvable' });

                const blockedUserId = blockedUser.id;

                const existing = db
                    .prepare(
                        `SELECT * FROM blocked_users
                         WHERE user_id = ? AND blocked_user_id = ?`
                    )
                    .get(userId, blockedUserId);

                if (!existing)
                    return reply
                        .status(400)
                        .send({ error: 'Utilisateur non bloqué' });

                db.prepare(
                    `DELETE FROM blocked_users
                     WHERE user_id = ? AND blocked_user_id = ?`
                ).run(userId, blockedUserId);

                return reply.send({
                    success: true,
                    message: 'Utilisateur débloqué',
                });
            } catch (err) {
                console.error('Erreur /blocked/remove', err);
                return reply.status(500).send({ error: 'Erreur serveur' });
            }
        }
    );
}
