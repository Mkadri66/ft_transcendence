export class MfaConfigureView {
    private section: HTMLElement;
    private form: any;
    private userId: number | null = null;

    constructor(userId: number) {
        this.section = document.createElement('section');
        this.section.className = 'mfa-configure';
        this.section.innerHTML = this.getHtml();
        this.form = null;
        this.userId = userId;
    }

    public getHtml(): string {
        return `
          <form id="mfa-setup-form" class="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8 space-y-6">
            <div class="space-y-2">
              <h2 class="text-3xl font-bold text-gray-800 text-center">Configuration MFA</h2>
              <p class="text-gray-600 text-center">Protégez votre compte avec une authentification à deux facteurs</p>
            </div>

            <!-- QR Code -->
            <div class="flex flex-col items-center space-y-4">
              <div id="qr-code" class="p-4 bg-white border border-gray-200 rounded-lg">
                <p class="text-center text-gray-500">Chargement du QR Code...</p>
              </div>
              <p class="text-sm text-gray-600 text-center">
                Si vous avez déjà scanné le QR code, il vous suffit d'entrer le code affiché dans votre application (Google Authenticator, Microsoft Authenticator, etc.).
              </p>
              <p class="text-sm text-gray-600 text-center">
                Sinon, scannez ce QR code avec votre application d'authentification (Google Authenticator, Microsoft Authenticator, etc.).
              </p>
            </div>

            <!-- Code MFA -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="mfa-code">Code de vérification</label>
              <input 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-xl tracking-widest"
                id="mfa-code"
                name="mfa-code"
                type="text"
                inputmode="numeric"
                pattern="[0-9]{6}"
                placeholder="123456"
                maxlength="6"
                required
              >
              <p class="mt-1 text-sm text-gray-500 text-center">
                Entrez le code à 6 chiffres généré par votre application
              </p>
            </div>

            <div class="flex flex-col space-y-3">
              <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors">
                Activer le MFA
              </button>
            </div>
          </form>
        `;
    }

    public render(container: HTMLElement): void {
        container.appendChild(this.section);
        this.setupEventListeners();
        this.generateMfaSecret();
    }

    public destroy(): void {
        if (this.form) {
            this.form.removeEventListener(
                'submit',
                this.handleSubmit.bind(this)
            );
        }
        const skipButton = this.section.querySelector('#skip-mfa');
        if (skipButton) {
            skipButton.removeEventListener('click', this.handleSkip.bind(this));
        }
        this.section.remove();
    }

    private setupEventListeners(): void {
        this.form = this.section.querySelector('#mfa-setup-form');
        this.form?.addEventListener('submit', this.handleSubmit.bind(this));

        const skipButton = this.section.querySelector('#skip-mfa');
        if (skipButton) {
            skipButton.addEventListener('click', this.handleSkip.bind(this));
        }
    }

    private async generateMfaSecret(): Promise<void> {
        try {
            const mfaSetupString = localStorage.getItem('mfaSetup');
            if (!mfaSetupString) {
                throw new Error('Configuration MFA introuvable');
            }
            const mfaSetupRaw = JSON.parse(mfaSetupString);
            const { userId } = mfaSetupRaw;
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/mfa/generate`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: userId }),
                    credentials: 'include',
                }
            );

            if (!response.ok) {
                throw new Error('Impossible de générer le secret MFA');
            }

            const data = await response.json();
            this.displayQrCode(data.qrCodeUrl, data.otpauthUrl);
        } catch (err) {
            console.error('Erreur lors de la génération MFA :', err);
            this.displayError(
                'Une erreur est survenue lors de la configuration MFA'
            );
        }
    }

    private displayQrCode(qrCodeUrl: string, secret: string): void {
        const qrContainer = this.section.querySelector('#qr-code');
        if (qrContainer) {
            qrContainer.innerHTML = `
                <img src="${qrCodeUrl}" alt="QR Code MFA" class="mx-auto"/>
            `;
        }
    }

    private displayError(message: string): void {
        const errorDiv = document.createElement('div');
        errorDiv.className =
            'bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4';
        errorDiv.innerHTML = `
            <p>${message}</p>
        `;

        const form = this.section.querySelector('#mfa-setup-form');
        form?.prepend(errorDiv);
    }

    private async handleSubmit(event: Event): Promise<void> {
        event.preventDefault();
        interface MfaSetup {
            userId: number;
            mfaSecret: string;
            timestamp: number;
        }

        // if (!this.form || !this.tempSecret || !this.userId) return;
        const formData = new FormData(this.form);
        const mfaCode = formData.get('mfa-code') as string;
        // Lecture de l'objet depuis localStorage

        // Validation basique du code
        if (!mfaCode || mfaCode.length !== 6 || !/^\d+$/.test(mfaCode)) {
            this.displayError('Veuillez entrer un code valide à 6 chiffres');
            return;
        }

        try {
            const stored = localStorage.getItem('mfaSetup');

            let userId: number | null = null;
            let timestamp: number | null = null;

            if (stored) {
                const mfaSetup: MfaSetup = JSON.parse(stored);

                userId = mfaSetup.userId;
                timestamp = mfaSetup.timestamp;

                console.log(userId, timestamp);
            } else {
                console.error("mfaSetup n'existe pas dans le localStorage");
            }

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/mfa/verify`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userId,
                        timestamp: timestamp,
                        mfaCode: mfaCode,
                    }),
                    credentials: 'include',
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Code MFA invalide');
            }
            try {
                const data = await response.json();
                console.log('Données reçues:', data);

                if (data.jwtToken) {
                    localStorage.setItem('jwtToken', data.jwtToken);
                    console.log(data.message);
                }
            } catch (error) {
                console.error('Erreur de lecture:', error);
            }
            window.history.pushState({}, '', '/dashboard');
            window.dispatchEvent(new PopStateEvent('popstate'));
        } catch (error) {
            console.error('Erreur MFA:', error);
            this.displayError(
                error instanceof Error
                    ? error.message
                    : 'Erreur lors de la vérification MFA'
            );
        }
    }

    private async handleSkip(): Promise<void> {
        if (
            confirm(
                'Êtes-vous sûr de vouloir configurer le MFA plus tard ? Votre compte sera moins sécurisé.'
            )
        ) {
            window.location.href = '/dashboard';
        }
    }
}
