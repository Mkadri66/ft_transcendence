import db from '../config/db.js';

export default async function editProfile(app) {
    app.get('/edit-profile', async (request, reply) => {
        try {
            // Vérifier l'authentification
            const token = request.headers.authorization?.split(' ')[1];
            if (!token) {
                return reply.status(401).send({ error: 'Token manquant' });
            }

            // Récupérer l'utilisateur depuis la base de données
            const user = db
                .prepare(
                    'SELECT id, username, avatar FROM users WHERE jwt_token = ?'
                )
                .get(token);

            if (!user) {
                return reply
                    .status(404)
                    .send({ error: 'Utilisateur non trouvé' });
            }

            return reply.send({
                username: user.username,
                avatar: user.avatar,
            });
        } catch (err) {
            console.error('Erreur:', err);
            return reply.status(500).send({ error: 'Erreur serveur' });
        }
    });

    app.patch('/user/profile', async (request, reply) => {
        try {
            const token = request.headers.authorization?.split(' ')[1];
            if (!token) {
                return reply.status(401).send({ error: 'Token manquant' });
            }

            const data = await request.file();
            const fields = data.fields;
            const username = fields.username?.value;
            const avatarFile = data.file;

            if (!username && !avatarFile) {
                return reply
                    .status(400)
                    .send({ error: 'Aucune donnée à mettre à jour' });
            }

            if (username) {
                const existingUser = await db
                    .prepare(
                        'SELECT id FROM users WHERE username = ? AND jwt_token != ?'
                    )
                    .get(username, token);
                if (existingUser) {
                    return reply
                        .status(409)
                        .send({ error: 'Ce pseudo est déjà utilisé' });
                }
            }

            let avatarPath = null;
            if (avatarFile) {
                const ext = avatarFile.filename.split('.').pop();
                const filename = `avatar_${Date.now()}.${ext}`;
                avatarPath = `/uploads/${filename}`;

                await saveFile(avatarFile, `public${avatarPath}`);
            }

            // Mettre à jour la base de données
            let query = 'UPDATE users SET ';
            const params = [];

            if (username) {
                query += 'username = ?, ';
                params.push(username);
            }

            if (avatarPath) {
                query += 'avatar = ?, ';
                params.push(avatarPath);
            }

            // Supprimer la dernière virgule
            query = query.slice(0, -2);
            query += ' WHERE jwt_token = ?';
            params.push(token);

            db.prepare(query, params);

            // Récupérer les nouvelles données utilisateur
            const updatedUser = db
                .prepare(
                    'SELECT username, avatar FROM users WHERE jwt_token = ?'
                )
                .get(token);

            return reply.send({
                message: 'Profil mis à jour avec succès',
                user: updatedUser,
            });
        } catch (err) {
            console.error('Erreur:', err);
            return reply.status(500).send({ error: 'Erreur serveur' });
        }
    });
}

// Helper pour sauvegarder les fichiers
async function saveFile(file, path) {
    const fs = require('fs/promises');
    const stream = file.file;
    const chunks = [];

    for await (const chunk of stream) {
        chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    await fs.writeFile(path, buffer);
}
