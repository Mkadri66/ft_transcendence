import cors from '@fastify/cors';

export const registerCors = (app) => {
    app.register(cors, {
        origin: 'https://localhost:5173',
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'credentials'],
        credentials: true,
        preflightContinue: true,
        credentials: true,
    });
};
