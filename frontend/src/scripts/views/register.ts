export class RegisterView {
    private section: HTMLElement;
    private form: HTMLFormElement | null;
    private errorBox: HTMLElement | null;

    constructor() {
        this.section = document.createElement('section');
        this.section.className = 'register';
        this.section.innerHTML = this.getHtml();
        this.form = null;
        this.errorBox = null;
    }

    public getHtml(): string {
        return `
          <form id="register-form" class="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8 space-y-6">
            <div class="space-y-2">
              <h2 class="text-3xl font-bold text-gray-800 text-center">Inscription</h2>
              <p class="text-gray-600 text-center">Creer un compte</p>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1" for="username">Pseudo*</label>
                <input 
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Votre pseudo"
                  required
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1" for="mail">Email*</label>
                <input 
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  id="mail"
                  name="mail"
                  type="mail"
                  placeholder="Votre email"
                  required
                >
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1" for="password">Mot de passe*</label>
                <input 
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1" for="password">Confirmer le mot de passe*</label>
                <input 
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  placeholder="••••••••"
                  required
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1" for="password">Avatar</label>
                <input 
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  id="avatar"
                  name="avatar"
                  type="file"
                  placeholder="••••••••"
                >

              <div class="bg-teal-100 border-t-4 border-teal-500 rounded-b text-teal-900 px-4 py-3 mt-4 shadow-md" role="alert">
                <div class="flex items-center">  <!-- Ajout de items-center ici -->
                  <div class="flex-shrink-0">  <!-- Conteneur SVG avec flex-shrink-0 -->
                    <svg class="fill-current h-6 w-6 text-teal-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/>
                    </svg>
                  </div>
                  <div class="ml-3">  <!-- Ajout de marge à gauche -->
                    <p class="text-sm">Les champs avec une * sont obligatoires.</p>
                  </div>
                </div>
              </div>
              <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mt-5 rounded relative" role="alert">
                <span class="block xl:inline"></span>
                <span class="absolute top-0 bottom-0 right-0 px-4 py-3">
                  <svg class="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                </span>
              </div>
              </div>
              <div class="flex items-center justify-between mt-2">
                <div class="flex items-center">
                  <input id="remember-me" name="remember-me" type="checkbox" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                  <label for="remember-me" class="ml-2 block text-sm text-gray-700">Se souvenir de moi</label>
                </div>
                <a href="#" class="text-sm text-blue-600 hover:text-blue-500">Mot de passe oublié ?</a>
              </div>

              <div>
                <button 
                  type="submit" 
                  class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 transform hover:scale-[1.02] shadow-md"
                >
                  Soumettre
                </button>
              </div>
            </div>

            <div class="text-center text-sm text-gray-500">
               Deja inscrit ?
              <a href="/login" class="text-blue-600 hover:text-blue-500 font-medium" data-link >Se connecter</a>
            </div>
          </form>
    `;
    }

    public render(container: HTMLElement): void {
        container.appendChild(this.section);
        this.errorBox = this.section.querySelector('.bg-red-100');
        this.hideError(); // Cache l'erreur au départ
        this.setupEventListeners();
    }

    public destroy(): void {
        if (this.form) {
            this.form.removeEventListener('submit', this.handleSubmit);
        }
        this.section.remove();
    }

    private setupEventListeners(): void {
        this.form = this.section.querySelector('form');
        this.form?.addEventListener('submit', this.handleSubmit.bind(this)); // Bind important
    }
    private showError(message: string): void {
        if (!this.errorBox) return;

        const messageSpan = this.errorBox.querySelector('span.block');
        const closeButton = this.errorBox.querySelector('svg');

        if (messageSpan) {
            messageSpan.innerHTML = message; // Utilisez innerHTML au lieu de textContent
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

    private validateForm(data: {
        username: string;
        password: string;
        confirmPassword: string;
        email: string;
    }): boolean {
        let isValid = true;
        const usernameRegex = /^[a-zA-Z0-9]{3,20}$/;
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        // Reset previous errors
        this.hideError();

        // Username validation
        if (!usernameRegex.test(data.username)) {
            this.showError(`
            Le pseudo doit :<br>
            - Contenir entre 3 et 20 caractères<br>
            - Utiliser seulement des lettres et chiffres<br>
            - Ne pas contenir d'espaces ou caractères spéciaux
        `);
            return false;
        }
        // Password validation
        else if (data.password !== data.confirmPassword) {
            this.showError('Les mots de passe doivent être identiques');
            return (isValid = false);
        } else if (!emailRegex.test(data.email)) {
            this.showError('Veuillez entrer une adresse email valide');
            return (isValid = false);
        } else if (!passwordRegex.test(data.password)) {
            this.showError(`
              <div class="text-left">
                  <p class="font-semibold">Le mot de passe doit contenir :</p>
                  <ul class="list-disc pl-5 mt-1">
                      <li>8 caractères minimum</li>
                      <li>1 majuscule et 1 minuscule</li>
                      <li>1 chiffre</li>
                      <li>1 caractère spécial (@$!%*?&)</li>
                  </ul>
              </div>
          `);
            return (isValid = false);
        }

        return isValid;
    }
    private async handleSubmit(e: Event): void {
        e.preventDefault(); // Empêche le rechargement
        if (!this.form) return;

        const formData = new FormData(this.form);
        const data = {
            username: formData.get('username') as string,
            email: formData.get('mail') as string,
            password: formData.get('password') as string,
            confirmPassword: formData.get('confirm_password') as string,
            avatar: formData.get('avatar') as File | null,
        };
        if (this.validateForm(data)) {
            // Soumission du formulaire si valide
            console.log('Formulaire valide:', data);
            // Ici vous pourriez ajouter l'appel à votre API
            this.hideError();
        }
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const result = await response.json();
            console.log('Succès:', result);
            // Redirection ou message de succès
            //window.location.href = '/dashboard';
        } catch (error) {
            console.error('Erreur:', error);
            this.showError("Échec de l'inscription. Veuillez réessayer.");
        }
    }
}
