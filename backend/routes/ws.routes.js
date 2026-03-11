import db from '../config/db.js';
import jwt from 'jsonwebtoken';

const connections = new Map();

export function sendToUser(userId, data) {
    const sockets = connections.get(userId);
    if (!sockets) {
        console.log(`[WS] sendToUser: no sockets for userId=${userId}`);
        return;
    }
    const message = JSON.stringify(data);
    for (const socket of sockets) {
        try {
            if (socket.readyState === 1) {
                socket.send(message);
                console.log(`[WS] sent to userId=${userId}:`, message.substring(0, 100));
            } else {
                console.log(`[WS] socket not ready for userId=${userId}, readyState=${socket.readyState}`);
            }
        } catch (e) {
            console.error(`[WS] sendToUser error for userId=${userId}:`, e.message);
        }
    }
}

export function notifyFriendsUpdated(userIds, action) {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    for (const userId of uniqueUserIds) {
        sendToUser(userId, { type: 'friends_updated', action });
    }
}

export default async function wsRoutes(app) {
    app.get('/ws/messages', { websocket: true }, (connection, request) => {
        const socket = connection.socket;

        console.log('[WS] New connection attempt, headers:', JSON.stringify(request.headers.cookie?.substring(0, 80)));

        // 1. Parse JWT from cookie
        let user = null;
        try {
            const cookieHeader = request.headers.cookie || '';
            const match = cookieHeader.match(/token_user_authenticated=([^;]+)/);
            if (!match) throw new Error('No token cookie found');
            const token = decodeURIComponent(match[1]);
            console.log('[WS] Token found, verifying...');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('[WS] Token decoded, email:', decoded.email);

            const row = db.prepare('SELECT id, username FROM users WHERE email = ?').get(decoded.email);
            if (!row) throw new Error(`User not found for email: ${decoded.email}`);
            user = row;
        } catch (e) {
            console.error('[WS] Auth error:', e.message);
            try {
                socket.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
                socket.close();
            } catch (_) {}
            return;
        }

        const { id: userId, username } = user;
        console.log(`[WS] Authenticated: userId=${userId}, username=${username}`);

        // 2. Store socket
        if (!connections.has(userId))
			connections.set(userId, new Set());
        connections.get(userId).add(socket);

        socket.on('message', (rawData) => {
            let data;
            try {
                data = JSON.parse(rawData.toString());
            } catch (e) {
                console.error('[WS] Malformed JSON:', rawData.toString());
                socket.send(JSON.stringify({ type: 'error', message: 'Malformed JSON' }));
                return;
            }

            console.log(`[WS] Received from ${username}:`, JSON.stringify(data).substring(0, 120));

            if (data.type === 'ping') {
                socket.send(JSON.stringify({ type: 'pong' }));
                return;
            }

            if (data.type === 'message') {
                const { to, content } = data;
                if (!to || !content || content.trim() === '') {
                    socket.send(JSON.stringify({ type: 'error', message: 'Invalid message: missing to or content' }));
                    return;
                }

                const receiver = db.prepare('SELECT id, username FROM users WHERE username = ?').get(to);
                if (!receiver) {
                    socket.send(JSON.stringify({ type: 'error', message: `User not found: ${to}` }));
                    return;
                }

                console.log(`[WS] Message from ${username} to ${to}: ${content.substring(0, 60)}`);

                // Save to DB
                const result = db.prepare(
                    `INSERT INTO messages (sender_id, receiver_id, content, created_at)
                     VALUES (?, ?, ?, datetime('now'))`
                ).run(userId, receiver.id, content.trim());

                const saved = db.prepare(
                    'SELECT id, created_at FROM messages WHERE id = ?'
                ).get(result.lastInsertRowid);

                const payload = {
                    type: 'message',
                    id: saved.id,
                    from: username,
                    to: receiver.username,
                    content: content.trim(),
                    created_at: saved.created_at,
                };

                console.log(`[WS] Sending message payload to sender (${userId}) and receiver (${receiver.id})`);

                // Send to sender (echo back)
                sendToUser(userId, payload);
                // Send to receiver
                sendToUser(receiver.id, payload);
                return;
            }

            console.log(`[WS] Unknown message type: ${data.type}`);
        });

        socket.on('close', (code, reason) => {
            console.log(`[WS] Connection closed for ${username}: code=${code}`);
            const sockets = connections.get(userId);
            if (sockets) {
                sockets.delete(socket);
                if (sockets.size === 0) {
                    connections.delete(userId);
                }
            }
        });

        socket.on('error', (err) => {
            console.error(`[WS] Socket error for ${username}:`, err.message);
        });
    });
}
