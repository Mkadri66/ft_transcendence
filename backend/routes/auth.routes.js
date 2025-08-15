import { register, googleSignup, validateToken , login} from '../controllers/authController.js';

export default async function authRoutes(app) {
  app.post('/register', register);
  app.post('/google-signup', googleSignup);
  app.get('/api/validate-token', validateToken)
  app.post('/login', login);
}
