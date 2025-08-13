import { 
    generateMfa, 
    verifyMfaToken, 
    validateMfaLogin 
} from '../controllers/mfaController.js';

export default async function mfaRoutes(app) {
    // Générer un secret MFA et QR Code
    app.post('/mfa/generate', generateMfa);
    
    // Vérifier et activer le MFA
    app.post('/mfa/verify', verifyMfaToken);
    
    // Valider un token MFA lors de la connexion
    app.post('/mfa/validate', validateMfaLogin);
}