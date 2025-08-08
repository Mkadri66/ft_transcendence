import authRoutes from './auth.routes.js';
import homeRoutes from './home.routes.js';

export default async function routes(app) {
    app.register(authRoutes, { prefix: '/auth' });
    app.register(homeRoutes);
}
