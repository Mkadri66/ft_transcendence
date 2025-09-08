export class ResetPasswordView {
    private section: HTMLElement;
    private form: HTMLFormElement | null;
    private errorBox: HTMLElement | null;
    private successBox: HTMLElement | null;

    constructor() {
        this.section = document.createElement('section');
        this.section.className = 'reset-password';
        this.section.innerHTML = this.getHtml();
        this.form = null;
        this.errorBox = this.section.querySelector('.bg-red-100');
        this.successBox = this.section.querySelector('#success-box');
    }

    public getHtml(): string {
        return `
        <form id="reset-password-form" class="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8 space-y-6">
          <div class="space-y-2">
            <h2 class="text-3xl font-bold text-gray-800 text-center">Réinitialiser le mot de passe</h2>
            <p class="text-gray-600 text-center">Modifiez votre mot de passe en toute sécurité</p>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="current-password">Mot de passe actuel</label>
              <input 
                id="current-password"
                name="currentPassword"
                type="password"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Votre mot de passe actuel"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="new-password">Nouveau mot de passe</label>
              <input 
                id="new-password"
                name="newPassword"
                type="password"
                required
                minlength="8"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Au moins 8 caractères"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="confirm-password">Confirmer le nouveau mot de passe</label>
              <input 
                id="confirm-password"
                name="confirmPassword"
                type="password"
                required
                minlength="8"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Répétez le nouveau mot de passe"
              >
            </div>

            <!-- Erreurs -->
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mt-5 rounded relative hidden" role="alert">
              <span class="block xl:inline"></span>
              <span class="absolute top-0 bottom-0 right-0 px-4 py-3">
                <svg class="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <title>Close</title>
                  <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
                </svg>
              </span>
            </div>

            <!-- Succès -->
            <div id="success-box" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 mt-5 rounded relative hidden" role="alert">
              <span class="block xl:inline"></span>
              <span class="absolute top-0 bottom-0 right-0 px-4 py-3">
                <svg class="fill-current h-6 w-6 text-green-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <title>Close</title>
                  <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
                </svg>
              </span>
            </div>

            <div>
              <button 
                type="submit" 
                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 transform hover:scale-[1.02] shadow-md"
              >
                Mettre à jour le mot de passe
              </button>
            </div>
          </div>
        </form>
        `;
    }

    public async render(container: HTMLElement): Promise<void> {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/check-reset-password`,
                {
                    method: 'GET',
                    credentials: 'include',
                }
            );

            const data = await response.json();

            if (response.status === 401) {
                window.history.pushState({}, '', '/dashboard');
                window.dispatchEvent(new PopStateEvent('popstate'));
                return;
            }
        } catch (error) {
            //this.showError('Erreur serveur, veuillez réessayer.');
        }
        container.appendChild(this.section);
        this.form = this.section.querySelector('form');
        this.form?.addEventListener('submit', this.handleSubmit.bind(this));
    }

    private hideError(): void {
        if (this.errorBox) {
            this.errorBox.classList.add('hidden');
        }
    }

    private hideSuccess(): void {
        if (this.successBox) {
            this.successBox.classList.add('hidden');
        }
    }

    private showError(message: string): void {
        if (!this.errorBox) return;
        const messageSpan = this.errorBox.querySelector('span.block');
        if (messageSpan) {
            messageSpan.innerHTML = message;
            this.errorBox.classList.remove('hidden');
        }

        const closeButton = this.errorBox.querySelector('svg');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.hideError());
        }
    }

    private showSuccess(message: string): void {
        if (!this.successBox) return;
        const messageSpan = this.successBox.querySelector('span.block');
        if (messageSpan) {
            messageSpan.innerHTML = message;
            this.successBox.classList.remove('hidden');
        }

        const closeButton = this.successBox.querySelector('svg');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.hideSuccess());
        }
    }

    private async handleSubmit(e: Event): Promise<void> {
        e.preventDefault();
        if (!this.form) return;

        const formData = new FormData(this.form);
        const currentPassword = formData.get('currentPassword') as string;
        const newPassword = formData.get('newPassword') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        this.hideError();
        // Validation côté client
        if (!currentPassword) {
            this.showError('Veuillez entrer votre mot de passe actuel.');
            return;
        }
        if (newPassword !== confirmPassword) {
            this.showError(
                'La confirmation du mot de passe ne correspond pas.'
            );
            return;
        }
        if (!passwordRegex.test(newPassword)) {
            this.showError(`
            <div class="text-left">
                <p class="font-semibold">Le nouveau mot de passe doit contenir :</p>
                <ul class="list-disc pl-5 mt-1">
                    <li>8 caractères minimum</li>
                    <li>1 majuscule et 1 minuscule</li>
                    <li>1 chiffre</li>
                    <li>1 caractère spécial (@$!%*?&)</li>
                </ul>
            </div>
        `);
            return;
        }

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/reset-password`,
                {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        currentPassword,
                        newPassword,
                        confirmPassword,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                this.showError(
                    data.error ||
                        'Erreur lors de la mise à jour du mot de passe.'
                );
                return;
            }

            this.showSuccess('Mot de passe mis à jour avec succès !');
            this.form.reset();
        } catch (error) {
            this.showError('Erreur serveur, veuillez réessayer.');
        }
    }
}
