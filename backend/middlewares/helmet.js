import fastifyHelmet from '@fastify/helmet';

export const registerHelmet = (app) => {
    app.register(fastifyHelmet, {
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false,
    });
};
