import db from '../config/db.js';
import path from 'path';
import fs from 'fs';

function detectImageFormat(buffer) {
    if (!Buffer.isBuffer(buffer)) return null;

    // PNG : 89 50 4E 47
    if (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
    ) {
        return 'png';
    }

    // JPEG : FF D8 FF E0 / FF D8 FF E1 / FF D8 FF DB
    if (
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff &&
        [0xe0, 0xe1, 0xdb].includes(buffer[3])
    ) {
        return 'jpeg';
    }

    return null; // format inconnu
}
export default async function editProfile(app) {
    app.get(
        '/user-profile',
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            try {
                const userPayload = request.user;

                if (!userPayload || !userPayload.email) {
                    return reply
                        .status(401)
                        .send({ error: 'Utilisateur non authentifié' });
                }

                const user = db
                    .prepare(
                        'SELECT id, username, avatar, email, google_account FROM users WHERE email = ?'
                    )
                    .get(userPayload.email);

                if (!user) {
                    return reply
                        .status(404)
                        .send({ error: 'Utilisateur non trouvé' });
                }

                const avatarUrl = user.avatar
                    ? `${request.protocol}://${request.headers.host}/uploads/${user.avatar}`
                    : null;

                return reply.send({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatar: avatarUrl,
                    google_account: user.google_account
                });
            } catch (err) {
                console.error('Erreur /user-profile:', err);
                return reply.status(500).send({ error: 'Erreur serveur' });
            }
        }
    );
    app.patch(
        '/edit-profile',
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            try {
                const userPayload = request.user;

                console.log('USER PAYLOAD', userPayload);

                if (!userPayload || !userPayload.email) {
                    return reply
                        .status(401)
                        .send({ error: 'Utilisateur non authentifié' });
                }

                const user = db
                    .prepare(
                        'SELECT id, username, avatar FROM users WHERE email = ?'
                    )
                    .get(userPayload.email);

                if (!user) {
                    return reply
                        .status(404)
                        .send({ error: 'Utilisateur non trouvé' });
                }

                const formData = request.body; // ⚠️ m
                const newUsername = formData.username?.trim();

                let newAvatar = user.avatar;
                if (formData.avatar) {
                    const buffer = Buffer.isBuffer(formData.avatar)
                        ? formData.avatar
                        : Buffer.from(formData.avatar.data);

                    const format = detectImageFormat(buffer);
                    if (!format) {
                        return reply.status(400).send({
                            error: 'Format de fichier non supporté (PNG ou JPEG requis)',
                        });
                    }

                    const avatarName = `${
                        newUsername || user.username
                    }.${format}`;
                    const uploadDir = path.join(process.cwd(), 'uploads');

                    if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true });
                    }

                    const filePath = path.join(uploadDir, avatarName);
                    fs.writeFileSync(filePath, buffer);
                    newAvatar = avatarName;
                }

                if (newUsername && newUsername !== user.username) {
                    const existingUser = db
                        .prepare('SELECT id FROM users WHERE username = ?')
                        .get(newUsername);

                    if (existingUser) {
                        return reply
                            .status(400)
                            .send({ error: 'Ce pseudo est déjà pris' });
                    }
                }

                db.prepare(
                    'UPDATE users SET username = ?, avatar = ? WHERE id = ?'
                ).run(newUsername || user.username, newAvatar, user.id);

                const updatedUser = db
                    .prepare(
                        'SELECT id, username, avatar FROM users WHERE id = ?'
                    )
                    .get(user.id);

                return reply.status(200).send({
                    message: 'Profil mis à jour avec succès',
                    username: updatedUser.username,
                    avatar: updatedUser.avatar
                        ? `${request.protocol}://${request.headers.host}/uploads/${updatedUser.avatar}`
                        : null,
                });
            } catch (err) {
                console.error('Erreur edit-profile:', err);
                return reply.status(500).send({ error: 'Erreur serveur' });
            }
        }
    );
}

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
