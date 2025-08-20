import authRoutes from './auth.routes.js';
import homeRoutes from './home.routes.js';
import mfaRoutes from './mfa.routes.js';
import editProfile from './edit-profile.routes.js';


export default async function routes(app) {
    app.register(authRoutes, { prefix: '/auth' });
    app.register(mfaRoutes);
    app.register(homeRoutes);
    app.register(editProfile);
}
