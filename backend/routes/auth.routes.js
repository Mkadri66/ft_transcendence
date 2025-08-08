import { register, googleSignup } from '../controllers/authController.js';

export default async function authRoutes(app) {
  app.post('/register', register);
  app.post('/google-signup', googleSignup);
}
