export class LoginView {
    private section: HTMLElement;
    private form: HTMLFormElement | null;
    private errorBox: HTMLElement | null;

    constructor() {
        this.section = document.createElement('section');
        this.section.className = 'login';
        this.section.innerHTML = this.getHtml();
        this.form = this.section.querySelector('form');
        this.errorBox = null;
    }
    public getHtml(): string {
        return `
          <form class="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8 space-y-6">
            <!-- En-tête -->
            <div class="space-y-2">
              <h2 class="text-3xl font-bold text-gray-800 text-center">Connexion</h2>
              <p class="text-gray-600 text-center">Accédez à votre compte</p>
            </div>

            <!-- Champs du formulaire -->
            <div class="space-y-4">
              <!-- Email -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1" for="email">Email</label>
                <input 
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  name="email"
                  type="email"
                  placeholder="votre@email.com"
                  required
                >
              </div>

              <!-- Mot de passe -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1" for="password">Mot de passe</label>
                <input 
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                >
              </div>

              <!-- Options -->
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <input id="remember-me" name="remember-me" type="checkbox" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                  <label for="remember-me" class="ml-2 block text-sm text-gray-700">Se souvenir de moi</label>
                </div>
                <a href="#" class="text-sm text-blue-600 hover:text-blue-500">Mot de passe oublié ?</a>
              </div>

              <!-- Bouton de soumission -->
              <div>
                <button 
                  type="submit" 
                  class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 transform hover:scale-[1.02] shadow-md"
                >
                  Se connecter
                </button>
              </div>
                <div id="error-message" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mt-5 rounded relative" role="alert">
                    <span class="block xl:inline"></span>
                    <span class="absolute top-0 bottom-0 right-0 px-4 py-3">
                        <svg class="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                    </span>
                </div>
            </div>
            <div id="google-signin-button" class="flex justify-center mt-4"></div>
            <!-- Lien vers inscription -->
            <div class="text-center text-sm text-gray-500">
              Pas encore de compte ?
              <a href="/register" class="text-blue-600 hover:text-blue-500 font-medium" data-link>S'inscrire</a>
            </div>
          </form>
    `;
    }

    public render(container: HTMLElement): void {
        container.appendChild(this.section);
        this.setupEventListeners();
        this.errorBox = this.section.querySelector('.bg-red-100');
        this.hideError();
        window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_CLIENT_ID_GOOGLE,
            callback: this.handleGoogleSignIn.bind(this),
        });

        const googleButton = document.getElementById('google-signin-button');
        if (googleButton) {
            window.google.accounts.id.renderButton(googleButton, {
                theme: 'outline',
                size: 'large',
            });
        }
    }

    public destroy(): void {
        this.section.remove();
    }
    private setupEventListeners(): void {
        if (this.form) {
            this.form.addEventListener(
                'submit',
                this.handleLoginSubmit.bind(this)
            );
        }
    }
    private async handleLoginSubmit(e: Event): Promise<void> {
        e.preventDefault();

        if (!this.form) return;

        const formData = new FormData(this.form);
        const credentials = {
            email: formData.get('email') as string,
            password: formData.get('password') as string,
            rememberMe: formData.get('remember-me') === 'on',
        };

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/auth/login`,
                {
                    method: 'POST',
                    credentials: 'include', // ← important pour envoyer et recevoir les cookies
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    body: JSON.stringify(credentials),
                }
            );
            console.log(response);
            if (!response.ok) {
                const errorData = await response.json();

                if (errorData.error === 'MFA_REQUIRED') {
                    window.location.href = errorData.redirectTo;
                    return;
                }

                const errorMessage =
                    errorData.error ||
                    `Erreur de connexion: ${response.status}`;
                this.showError(errorMessage);
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Erreur de connexion:', error);
            this.showError(
                error instanceof Error
                    ? error.message
                    : 'Échec de la connexion. Veuillez réessayer.'
            );
        }
    }

    private async handleGoogleSignIn(
        response: google.accounts.id.CredentialResponse
    ): Promise<void> {
        const idToken = response.credential;

        try {
            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/auth/google-signup`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ idToken }),
                }
            );

            if (!res.ok) {
                const data = await res.json();

                if (data.error === 'MFA_REQUIRED' && data.redirectTo) {
                    window.history.pushState({}, '', data.redirectTo);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                }
                this.showError(data.error);
            }

            return;
        } catch (error) {
            console.error('Erreur Google Sign-In:', error);
        }
    }

    private showError(message: string): void {
        if (!this.errorBox) return;

        const messageSpan = this.errorBox.querySelector('span.block');
        const closeButton = this.errorBox.querySelector('svg');

        if (messageSpan) {
            messageSpan.innerHTML = message;
            this.errorBox.classList.remove('hidden');
        }

        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.hideError();
            });
        }
    }

    private hideError(): void {
        if (this.errorBox) {
            this.errorBox.classList.add('hidden');
        }
    }
}
