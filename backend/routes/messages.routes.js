import db from '../config/db.js';

export default async function messagesRoutes(app) {

    app.get(
        '/messages/conversation/:username',
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            try {
                const payload = request.user;
                const { username } = request.params;

                const me = db.prepare(
                    'SELECT id FROM users WHERE email = ?'
                ).get(payload.email);

                const other = db.prepare(
                    'SELECT id FROM users WHERE username = ?'
                ).get(username);

                if (!me || !other) {
                    return reply.status(404).send({ error: 'Utilisateur introuvable' });
                }

                const messages = db.prepare(`
                    SELECT
                        m.id,
                        u1.username AS sender,
                        u2.username AS receiver,
                        m.content,
                        m.created_at
                    FROM messages m
                    JOIN users u1 ON u1.id = m.sender_id
                    JOIN users u2 ON u2.id = m.receiver_id
                    WHERE
                        (m.sender_id = ? AND m.receiver_id = ?)
                        OR
                        (m.sender_id = ? AND m.receiver_id = ?)
                    ORDER BY m.created_at ASC
                `).all(me.id, other.id, other.id, me.id);

                return reply.send({ messages });

            } catch (err) {
                console.error(err);
                return reply.status(500).send({ error: 'Erreur serveur' });
            }
        }
    );
	app.post(
	    '/messages/send',
	    { preHandler: [app.authenticate] },
	    async (request, reply) => {
	        try {
	            const payload = request.user;
	            const { username, content } = request.body;

	            if (!content || content.trim() === '') {
	                return reply.status(400).send({ error: 'Le message est vide' });
	            }

	            const me = db.prepare('SELECT id FROM users WHERE email = ?').get(payload.email);
	            const other = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

	            if (!me || !other) {
	                return reply.status(404).send({ error: 'Utilisateur introuvable' });
	            }

	            db.prepare(`
	                INSERT INTO messages (sender_id, receiver_id, content, created_at)
	                VALUES (?, ?, ?, datetime('now'))
	            `).run(me.id, other.id, content.trim());

	            return reply.send({ success: true });
	        } catch (err) {
	            console.error(err);
	            return reply.status(500).send({ error: 'Erreur serveur' });
	        }
	    }
	);
	app.post(
	    '/messages/start',
	    { preHandler: [app.authenticate] },
	    async (request, reply) => {
	        try {
	            const payload = request.user;
	            const { username } = request.body;

	            const me = db.prepare('SELECT id FROM users WHERE email = ?').get(payload.email);
	            const other = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

	            if (!me || !other) {
	                return reply.status(404).send({ error: 'Utilisateur introuvable' });
	            }

	            // Vérifier si des messages existent déjà entre les deux
	            const exists = db.prepare(`
	                SELECT id FROM messages
	                WHERE (sender_id = ? AND receiver_id = ?)
	                   OR (sender_id = ? AND receiver_id = ?)
	            `).get(me.id, other.id, other.id, me.id);

	            if (!exists) {
	                // Créer un premier message vide pour initier la conversation
	                db.prepare(`
	                    INSERT INTO messages (sender_id, receiver_id, content, created_at)
	                    VALUES (?, ?, ?, datetime('now'))
	                `).run(me.id, other.id, ''); // contenu vide
	            }

	            return reply.send({ success: true });
	        } catch (err) {
	            console.error(err);
	            return reply.status(500).send({ error: 'Erreur serveur' });
	        }
	    }
	);
    app.get(
        '/messages/conversations',
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            try {
                const payload = request.user;

                const me = db.prepare(
                    'SELECT id FROM users WHERE email = ?'
                ).get(payload.email);

                const conversations = db.prepare(`
                    SELECT DISTINCT
                        CASE
                            WHEN m.sender_id = ? THEN u2.username
                            ELSE u1.username
                        END as username
                    FROM messages m
                    JOIN users u1 ON u1.id = m.sender_id
                    JOIN users u2 ON u2.id = m.receiver_id
                    WHERE m.sender_id = ?
                       OR m.receiver_id = ?
                `).all(me.id, me.id, me.id);

                return reply.send({ conversations });

            } catch (err) {
                console.error(err);
                return reply.status(500).send({ error: 'Erreur serveur' });
            }
        }
    );
}
