import authRoutes from './auth.routes.js';
import homeRoutes from './home.routes.js';
import mfaRoutes from './mfa.routes.js';
import editProfile from './edit-profile.routes.js';
import resetPassword from './reset-password.routes.js';
import profileRoutes from './profile.routes.js';
import dashboardRoute from './dashboard.routes.js';
import deleteAccount from './delete-account.routes.js';
import Tournament from './tournament.routes.js';

export default async function routes(app) {
    app.register(authRoutes, { prefix: '/auth' });
    app.register(mfaRoutes);
    app.register(homeRoutes);
    app.register(editProfile);
    app.register(resetPassword);
    app.register(profileRoutes);
    app.register(dashboardRoute);
    app.register(deleteAccount);
    app.register(Tournament)
}
