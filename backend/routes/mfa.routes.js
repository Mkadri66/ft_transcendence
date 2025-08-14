import { 
    generateMfa, 
    verifyMfaToken
} from '../controllers/mfaController.js';

export default async function mfaRoutes(app) {
    // Générer un secret MFA et QR Code
    app.post('/mfa/generate', generateMfa);
    
    // Vérifier et activer le MFA
    app.post('/mfa/verify', verifyMfaToken);
    
}