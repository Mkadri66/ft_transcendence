export class MfaConfigureView {
    private section: HTMLElement;
    private form: HTMLFormElement | null;

    constructor() {
        this.section = document.createElement('section');
        this.section.className = 'mfa-configure';
        this.section.innerHTML = this.getHtml();
        this.form = null;
    }

    public getHtml(): string {
        return `
          <form id="mfa-setup-form" class="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8 space-y-6">
            <!-- En-tête -->
            <div class="space-y-2">
              <h2 class="text-3xl font-bold text-gray-800 text-center">Configuration MFA</h2>
              <p class="text-gray-600 text-center">Protégez votre compte avec une authentification à deux facteurs</p>
            </div>

            <!-- QR Code pour l'application d'authentification -->
            <div class="flex flex-col items-center space-y-4">
              <div id="qr-code" class="p-4 bg-white border border-gray-200 rounded-lg">
                <!-- Le QR Code sera généré ici par JavaScript -->
                <p class="text-center text-gray-500">Chargement du QR Code...</p>
              </div>
              
              <p class="text-sm text-gray-600 text-center">
                Scannez ce QR Code avec votre application d'authentification (Google Authenticator, Authy, etc.)
              </p>
            </div>

            <!-- Code de secours -->
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm text-yellow-700">
                    Conservez ces codes de secours en lieu sûr. Ils vous permettront d'accéder à votre compte si vous perdez votre appareil.
                  </p>
                  <div id="backup-codes" class="mt-2 grid grid-cols-2 gap-2">
                    <!-- Les codes seront générés ici -->
                  </div>
                </div>
              </div>
            </div>

            <!-- Champ de vérification -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="mfa-code">Code de vérification</label>
              <input 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-center text-xl tracking-widest"
                id="mfa-code"
                name="mfa-code"
                type="text"
                inputmode="numeric"
                pattern="[0-9]{6}"
                placeholder="123456"
                maxlength="6"
                required
              >
            </div>

            <!-- Bouton de soumission -->
            <div>
              <button 
                type="submit" 
                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 transform hover:scale-[1.02] shadow-md"
              >
                Activer le MFA
              </button>
            </div>

            <!-- Lien pour plus tard -->
            <div class="text-center text-sm text-gray-500">
              <a href="/dashboard" class="text-blue-600 hover:text-blue-500 font-medium" data-link>Configurer plus tard</a>
            </div>
          </form>
        `;
    }

    public render(container: HTMLElement): void {
        container.appendChild(this.section);
        this.setupEventListeners();
        this.generateQrCode();
        this.generateBackupCodes();
    }

    public destroy(): void {
        if (this.form) {
            this.form.removeEventListener('submit', this.handleSubmit.bind(this));
        }
        this.section.remove();
    }

    private setupEventListeners(): void {
        this.form = this.section.querySelector('#mfa-setup-form');
        this.form?.addEventListener('submit', this.handleSubmit.bind(this));
    }

    private generateQrCode(): void {
        const qrContainer = this.section.querySelector('#qr-code');
        if (qrContainer) {
            // En production, vous feriez une requête au backend pour obtenir les données du QR Code
            qrContainer.innerHTML = `
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/MyApp:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=MyApp" 
                     alt="QR Code MFA" 
                     class="mx-auto"/>
                <p class="mt-2 text-center text-sm text-gray-600">Secret: JBSWY3DPEHPK3PXP</p>
            `;
        }
    }

    private generateBackupCodes(): void {
        const codesContainer = this.section.querySelector('#backup-codes');
        if (codesContainer) {
            // Générer 10 codes de secours (en production, cela viendrait du backend)
            const backupCodes = Array.from({ length: 10 }, () => 
                Math.random().toString(36).substring(2, 8).toUpperCase()
            );
            
            codesContainer.innerHTML = backupCodes.map(code => `
                <span class="font-mono bg-gray-100 px-2 py-1 rounded text-sm">${code}</span>
            `).join('');
        }
    }

    private async handleSubmit(event: Event): Promise<void> {
        event.preventDefault();
        if (!this.form) return;

        const formData = new FormData(this.form);
        const mfaCode = formData.get('mfa-code') as string;

        try {
            // En production, vous enverriez ce code au backend pour validation
            const response = await fetch(`${import.meta.env.VITE_API_URL}/mfa/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code: mfaCode }),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Code MFA invalide');
            }

            // Redirection après succès
            //window.location.href = '/dashboard';
            
        } catch (error) {
            console.error('Erreur MFA:', error);
            alert('Erreur lors de la configuration du MFA. Veuillez réessayer.');
        }
    }
}