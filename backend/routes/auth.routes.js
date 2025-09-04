import { register, googleSignup, validateToken , login, logout } from '../controllers/authController.js';

export default async function authRoutes(app) {
  app.post('/register', register);
  app.post('/google-signup', googleSignup);
  app.get('/api/validate-token', validateToken)
  app.post('/login', login);
  app.post('/logout', logout)
}
