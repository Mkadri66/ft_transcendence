import fastify from 'fastify';
import fs from 'fs';
import { registerCors } from './middlewares/cors.js';
import { registerHelmet } from './middlewares/helmet.js';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import cookie from '@fastify/cookie';
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

// Serveur
const start = async () => {
    try {
        await app.listen({
            port: 3000,
            host: '0.0.0.0',
        });
        console.log('🚀 Serveur HTTPS démarré sur https://localhost:3000');
        console.log('🏥 Health check: https://localhost:3000/health');
    } catch (err) {
        console.error('❌ Erreur démarrage serveur:', err);
        process.exit(1);
    }
};

start();
