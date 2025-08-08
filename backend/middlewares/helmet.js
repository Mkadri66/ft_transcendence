import fastifyHelmet from '@fastify/helmet';

export const registerHelmet = (app) => {
  app.register(fastifyHelmet, {
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  });
};
