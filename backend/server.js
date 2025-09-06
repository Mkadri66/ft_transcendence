import fastify from 'fastify';
import fs from 'fs';
import { registerCors } from './middlewares/cors.js';
import { registerHelmet } from './middlewares/helmet.js';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import cookie from '@fastify/cookie';
import websocketPlugin from '@fastify/websocket';
import routes from './routes/index.js';
import path from 'path';
import jwt from 'jsonwebtoken';
import './config/env.js';

// Certificats
const app = fastify({
    https: {
        key: fs.readFileSync('./cert/key.pem'),
        cert: fs.readFileSync('./cert/cert.pem'),
    },
    // Configuration logger corrigée
    logger: {
        level: 'info',
        // Remplacer prettyPrint par transport pour la nouvelle version
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss',
                ignore: 'pid,hostname'
            }
        }
    },
    // Alternative simple sans pretty print
    // logger: true,  // Simple logger sans formatage
    // ou
    // logger: false, // Pas de logs du tout
});

// Middlewares
registerCors(app);
registerHelmet(app);

// Gestion des fichiers
app.register(fastifyMultipart, {
    attachFieldsToBody: 'keyValues',
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
    },
});

app.register(fastifyStatic, {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
    setHeaders: (res, pathName, stat) => {
        res.setHeader('Access-Control-Allow-Origin', 'https://localhost:5173');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
});

app.register(cookie, {
    secret: process.env.COOKIE_SECRET,
    parseOptions: {},
});

// IMPORTANT: Enregistrer le plugin WebSocket
app.register(websocketPlugin);

// Décorateur pour vérifier l'authentification
app.decorate('authenticate', async function (request, reply) {
    try {
        const token = request.cookies['token_user_authenticated'];
        console.log('COOKIE USER', request.cookies);

        if (!token) {
            return reply.code(401).send({ error: 'Token manquant (cookie)' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        request.user = decoded;
    } catch (err) {
        return reply
            .code(401)
            .send({ error: 'Non autorisé', details: err.message });
    }
});

// Routes
app.register(routes);

// WebSocket - Variables globales pour le chat/tournoi
const sockets = new Set();
const blocked = {}; // username -> [blockedUsernames]
const connectedUsers = new Map(); // connection -> username
const userList = new Set(); // liste des utilisateurs connectés

// WebSocket endpoint
app.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (connection, req) => {
        console.log('🔌 Nouvelle connexion WebSocket');
        
        sockets.add(connection);
        
        // Gérer la connexion
        connection.socket.on('message', (raw) => {
            try {
                const msg = JSON.parse(raw.toString());
                console.log('📨 Message reçu:', msg);

                // Gestion des différents types de messages
                switch (msg.type) {
                    case 'join':
                        handleUserJoin(connection, msg);
                        break;
                    case 'chat':
                        handleChatMessage(connection, msg);
                        break;
                    case 'block':
                        handleBlockUser(connection, msg);
                        break;
                    case 'invite':
                        handleInviteMessage(connection, msg);
                        break;
                    case 'tournament':
                        handleTournamentMessage(connection, msg);
                        break;
                    case 'profile':
                        handleProfileRequest(connection, msg);
                        break;
                    default:
                        console.log('Type de message non reconnu:', msg.type);
                }
            } catch (error) {
                console.error('❌ Erreur parsing message WebSocket:', error);
            }
        });

        connection.socket.on('close', () => {
            console.log('🔌 Connexion WebSocket fermée');
            
            // Nettoyer les références
            const username = connectedUsers.get(connection);
            if (username) {
                userList.delete(username);
                connectedUsers.delete(connection);
                broadcastUserList();
            }
            
            sockets.delete(connection);
        });

        connection.socket.on('error', (error) => {
            console.error('❌ Erreur WebSocket:', error);
            sockets.delete(connection);
        });

        // Envoyer la liste des utilisateurs au nouveau client
        sendToConnection(connection, {
            type: 'users',
            users: Array.from(userList)
        });
    });
});

// Fonctions de gestion des messages
function handleUserJoin(connection, msg) {
    if (msg.username) {
        connectedUsers.set(connection, msg.username);
        userList.add(msg.username);
        console.log(`👤 ${msg.username} rejoint le chat`);
        
        // Diffuser la liste mise à jour
        broadcastUserList();
        
        // Message de bienvenue
        broadcast({
            type: 'info',
            text: `${msg.username} a rejoint le chat`
        });
    }
}

function handleChatMessage(connection, msg) {
    console.log(`💬 Chat: ${msg.from} -> ${msg.to}: ${msg.text}`);
    
    // Vérifier si l'utilisateur est bloqué
    const blockedList = blocked[msg.to] || [];
    if (blockedList.includes(msg.from)) {
        console.log(`🚫 Message bloqué: ${msg.from} est bloqué par ${msg.to}`);
        return;
    }

    // Diffuser le message
    broadcast({
        type: 'chat',
        from: msg.from,
        to: msg.to,
        text: msg.text
    });
}

function handleBlockUser(connection, msg) {
    if (!blocked[msg.from]) {
        blocked[msg.from] = [];
    }
    
    if (!blocked[msg.from].includes(msg.to)) {
        blocked[msg.from].push(msg.to);
    }
    
    console.log(`🚫 ${msg.from} a bloqué ${msg.to}`);
    
    sendToConnection(connection, {
        type: 'info',
        text: `Utilisateur ${msg.to} bloqué.`
    });
}

function handleInviteMessage(connection, msg) {
    console.log(`🎮 Invitation: ${msg.from} invite ${msg.to}`);
    
    broadcast({
        type: 'invite',
        from: msg.from,
        to: msg.to,
        text: `${msg.from} a invité ${msg.to} à jouer au Pong!`
    });
}

function handleTournamentMessage(connection, msg) {
    console.log(`🏆 Tournoi: ${msg.text}`);
    
    broadcast({
        type: 'tournament',
        text: msg.text || 'Message de tournoi'
    });
}

function handleProfileRequest(connection, msg) {
    // Données de démonstration - remplacer par vraies données
    const demoProfile = {
        username: msg.username,
        wins: Math.floor(Math.random() * 20),
        losses: Math.floor(Math.random() * 15),
        winRate: Math.floor(Math.random() * 100),
        gamesPlayed: Math.floor(Math.random() * 50)
    };
    
    sendToConnection(connection, {
        type: 'profile',
        user: demoProfile
    });
}

// Fonctions utilitaires
function broadcast(message) {
    const messageStr = JSON.stringify(message);
    let sentCount = 0;
    
    for (const connection of sockets) {
        if (connection.socket.readyState === connection.socket.OPEN) {
            try {
                connection.socket.send(messageStr);
                sentCount++;
            } catch (error) {
                console.error('❌ Erreur envoi broadcast:', error);
                sockets.delete(connection);
            }
        } else {
            // Nettoyer les connexions fermées
            sockets.delete(connection);
        }
    }
    
    console.log(`📡 Message diffusé à ${sentCount} clients`);
}

function sendToConnection(connection, message) {
    if (connection.socket.readyState === connection.socket.OPEN) {
        try {
            connection.socket.send(JSON.stringify(message));
        } catch (error) {
            console.error('❌ Erreur envoi message:', error);
        }
    }
}

function broadcastUserList() {
    broadcast({
        type: 'users',
        users: Array.from(userList)
    });
}

// Route de test pour vérifier que le serveur fonctionne
app.get('/health', async (request, reply) => {
    return { 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        websocketClients: sockets.size,
        connectedUsers: Array.from(userList)
    };
});

// Serveur
const start = async () => {
    try {
        await app.listen({ 
            port: 3000, 
            host: '0.0.0.0'
        });
        console.log('🚀 Serveur HTTPS démarré sur https://localhost:3000');
        console.log('🔌 WebSocket disponible sur wss://localhost:3000/ws');
        console.log('🏥 Health check: https://localhost:3000/health');
    } catch (err) {
        console.error('❌ Erreur démarrage serveur:', err);
        process.exit(1);
    }
};

start();