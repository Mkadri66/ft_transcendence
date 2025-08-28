import db from '../config/db.js';
import jwt from 'jsonwebtoken';

export default async function profileRoutes(app) {
    app.get('/profile/:username', async (request, reply) => {
        try {
            const { username } = request.params;

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
                avatar: user.avatar ? user.avatar : null,
                createdAt: user.created_at,
                stats: stats || {
                    total_games: 0,
                    wins: 0,
                    losses: 0,
                    highest_score: 0,
                },
                totalTournamentsWon: tournamentsWon?.total_tournaments_won || 0,
                history,
            });
        } catch (err) {
            console.error('Erreur route /profile/:username:', err);
            return reply.status(500).send({ error: 'Erreur serveur' });
        }
    });

    app.get('/friends/check/:username', async (req, reply) => {
        const authHeader = req.headers['authorization'];
        if (!authHeader)
            return reply.status(401).send({ error: 'Token manquant' });
        const token = authHeader.split(' ')[1];
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            return reply.status(401).send({ error: 'Token invalide' });
        }

        const user = db
            .prepare('SELECT id FROM users WHERE email = ?')
            .get(decoded.email);
        if (!user)
            return reply.status(404).send({ error: 'Utilisateur introuvable' });

        const friend = db
            .prepare('SELECT id FROM users WHERE username = ?')
            .get(req.params.username);
        if (!friend)
            return reply.status(404).send({ error: 'Utilisateur introuvable' });

        const existing = db
            .prepare(
                `
        SELECT * FROM friends 
        WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
    `
            )
            .get(user.id, friend.id, friend.id, user.id);

        return reply.send({ areFriends: !!existing });
    });

    app.post('/friends/add', async (request, reply) => {
        try {
            console.log('➡️ Nouvelle requête POST /friends/add/:username');
            console.log('Headers:', request.headers);

            // 1. Récupération du JWT
            const authHeader = request.headers['authorization'];
            console.log('🔑 authHeader =', authHeader);

            if (!authHeader) {
                return reply.status(401).send({ error: 'Token manquant' });
            }

            const token = authHeader.split(' ')[1];
            console.log('🔑 token =', token);

            if (!token) {
                return reply.status(401).send({ error: 'Token invalide' });
            }

            // 2. Vérifier et décoder le JWT
            let decoded;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET);
                console.log('✅ JWT décodé =', decoded);
            } catch (err) {
                console.error('❌ Erreur vérification JWT:', err.message);
                return reply.status(401).send({ error: 'Token invalide' });
            }
            const user = db
                .prepare('SELECT id FROM users WHERE email = ?')
                .get(decoded.email);
            const userId = user?.id;
            const friendUsername = request.body.username;
            console.log('👤 userId (depuis JWT) =', userId);
            console.log('👥 friendUsername (depuis le body) =', friendUsername);

            if (!userId || !friendUsername) {
                console.error('⚠️ Paramètres manquants', {
                    userId,
                    friendUsername,
                });
                return reply
                    .status(400)
                    .send({ error: 'Paramètres manquants' });
            }

            // 3. Trouver l’ami par son username
            const friend = db
                .prepare(`SELECT id FROM users WHERE username = ?`)
                .get(friendUsername);
            console.log('📄 Résultat SELECT user =', friend);

            if (!friend) {
                console.error(
                    '❌ Utilisateur introuvable avec username =',
                    friendUsername
                );
                return reply
                    .status(404)
                    .send({ error: 'Utilisateur introuvable' });
            }

            const friendId = friend.id;
            console.log('👥 friendId (depuis DB) =', friendId);

            // 4. Vérifie si déjà amis
            const existing = db
                .prepare(
                    `
                SELECT * FROM friends 
                WHERE (user_id = ? AND friend_id = ?)
                   OR (user_id = ? AND friend_id = ?)
            `
                )
                .get(userId, friendId, friendId, userId);
            console.log('🔎 Vérification relation existante =', existing);

            if (existing) {
                console.warn('⚠️ Déjà en relation', existing);
                return reply.status(400).send({ error: 'Déjà en relation' });
            }

            // 5. Insère la relation
            const insert = db
                .prepare(
                    `
            INSERT INTO friends (user_id, friend_id) 
            VALUES (?, ?)
        `
                )
                .run(userId, friendId);
            console.log('📝 Insert relation retour =', insert);

            // 🔹 Log liste d’amis mise à jour
            const updatedFriends = db
                .prepare(
                    `
                        SELECT u.username, u.avatar
                        FROM friends f
                        JOIN users u ON (u.id = f.friend_id OR u.id = f.user_id)
                        WHERE (f.user_id = ? OR f.friend_id = ?) AND u.id != ?
                    `
                )
                .all(userId, userId, userId);

            console.log('📋 Liste d’amis après ajout =', updatedFriends);
            return reply.send({ success: true, message: 'Ami ajouté' });
        } catch (err) {
            console.error('🔥 Erreur route /friends/add/:username:', err);
            return reply.status(500).send({ error: 'Erreur serveur' });
        }
    });

    app.delete('/friends/remove', async (request, reply) => {
        try {
            console.log('➡️ Nouvelle requête DELETE /friends/remove');
            console.log('Headers:', request.headers);

            // 1. Récupération du JWT
            const authHeader = request.headers['authorization'];
            if (!authHeader)
                return reply.status(401).send({ error: 'Token manquant' });

            const token = authHeader.split(' ')[1];
            if (!token)
                return reply.status(401).send({ error: 'Token invalide' });

            // 2. Vérifier et décoder le JWT
            let decoded;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET);
                console.log('✅ JWT décodé =', decoded);
            } catch (err) {
                console.error('❌ Erreur vérification JWT:', err.message);
                return reply.status(401).send({ error: 'Token invalide' });
            }

            // 3. Récupérer les IDs
            const user = db
                .prepare('SELECT id FROM users WHERE email = ?')
                .get(decoded.email);
            const userId = user?.id;
            const friendUsername = request.body.username; // <-- récupéré depuis le body
            console.log('👤 userId =', userId);
            console.log('👥 friendUsername =', friendUsername);

            if (!userId || !friendUsername) {
                return reply
                    .status(400)
                    .send({ error: 'Paramètres manquants' });
            }

            const friend = db
                .prepare('SELECT id FROM users WHERE username = ?')
                .get(friendUsername);
            if (!friend)
                return reply
                    .status(404)
                    .send({ error: 'Utilisateur introuvable' });

            const friendId = friend.id;

            // 4. Vérifie si la relation existe
            const existing = db
                .prepare(
                    `
        SELECT * FROM friends 
        WHERE (user_id = ? AND friend_id = ?) 
           OR (user_id = ? AND friend_id = ?)
        `
                )
                .get(userId, friendId, friendId, userId);

            if (!existing) {
                return reply
                    .status(400)
                    .send({ error: 'Pas d’amitié existante' });
            }

            // 5. Supprime la relation
            const del = db
                .prepare(
                    `
        DELETE FROM friends 
        WHERE (user_id = ? AND friend_id = ?) 
           OR (user_id = ? AND friend_id = ?)
        `
                )
                .run(userId, friendId, friendId, userId);

            console.log('🗑️ Suppression relation retour =', del);

            const updatedFriends = db
                .prepare(
                    `
                    SELECT u.username, u.avatar
                    FROM friends f
                    JOIN users u ON (u.id = f.friend_id OR u.id = f.user_id)
                    WHERE (f.user_id = ? OR f.friend_id = ?) AND u.id != ?
                `
                )
                .all(userId, userId, userId);

            console.log('📋 Liste d’amis après suppression =', updatedFriends);
            return reply.send({ success: true, message: 'Ami supprimé' });
        } catch (err) {
            console.error('🔥 Erreur route /friends/remove:', err);
            return reply.status(500).send({ error: 'Erreur serveur' });
        }
    });
}
