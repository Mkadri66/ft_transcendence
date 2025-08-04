import fastify from 'fastify';
import cors from '@fastify/cors';

const app = fastify();

// Middlewares essentiels
app.register(cors, {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
});


// Route GET /
app.get('/', async (request, reply) => {
    return { hello: 'world' };
});

// Route POST /register
app.post('/register', {
    schema: {
        body: {
            type: 'object',
            required: ['username', 'email', 'password'],
            properties: {
                username: { type: 'string' },
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 8 }
            }
        }
    }
}, async (request, reply) => {
    console.log('Données reçues:', request.body);
    return reply.send({ 
        success: true,
        user: request.body
    });
});

// Démarrer le serveur
const start = async () => {
    try {
        await app.listen({ 
            port: 3000,
            host: '0.0.0.0'
        });
        console.log('Server running on http://localhost:3000');
    } catch (err) {
        console.error('Erreur démarrage:', err);
        process.exit(1);
    }
};

start();