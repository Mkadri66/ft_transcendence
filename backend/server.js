import fastify from 'fastify';
import cors from '@fastify/cors';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';
dotenv.config();


const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000/auth/google/callback'  // redirection après login
);


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
    //console.log('Données reçues:', request.body);
    return reply.send({ 
        success: true,
        user: request.body
    });
});


app.post('/auth/google', async (req, reply) => {
    const { idToken } = req.body;
    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const email = payload?.email;
        const name = payload?.name;

        // Tu peux ici créer un utilisateur s'il n'existe pas encore
        // ou récupérer l'utilisateur déjà enregistré
        console.log(payload)
        return reply.send({ success: true, email, name });
    } catch (err) {
        console.error(err);
        return reply.status(401).send({ error: 'Token invalide' });
    }
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