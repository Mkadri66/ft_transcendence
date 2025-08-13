import fastify from 'fastify';
import { registerCors } from './middlewares/cors.js';
import { registerHelmet } from './middlewares/helmet.js';
import routes from './routes/index.js';
import './config/env.js';

const app = fastify();


// Middlewares
registerCors(app);
registerHelmet(app);

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
