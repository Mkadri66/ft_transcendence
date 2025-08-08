import cors from '@fastify/cors';

export const registerCors = (app) => {
  app.register(cors, {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    preflightContinue: true,
  });
};
