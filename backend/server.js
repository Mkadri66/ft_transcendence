import fastify from 'fastify';
import { registerCors } from './middlewares/cors.js';
import { registerHelmet } from './middlewares/helmet.js';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import routes from './routes/index.js';
import path from 'path';
import './config/env.js';

const app = fastify({
    logger: false,
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
});

// app.addHook('preHandler', (request, reply, done) => {
//     console.log('Headers reçus:', request.headers['content-type']);
//     done();
// });
// Routes
app.register(routes);

// Serveur
const start = async () => {
    try {
        await app.listen({ port: 3000, host: '0.0.0.0' });
        console.log('🚀 Server running on http://localhost:3000');
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

start();
