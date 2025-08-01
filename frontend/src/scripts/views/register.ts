export class RegisterView {
    private section: HTMLElement;
    private form: HTMLFormElement | null;

    constructor() {
        this.section = document.createElement('section');
        this.section.className = 'register';
        this.section.innerHTML = this.getHtml();
        this.form = null;
    }

    public getHtml(): string {
        return `
          <form class="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8 space-y-6">
            <div class="space-y-2">
              <h2 class="text-3xl font-bold text-gray-800 text-center">Inscription</h2>
              <p class="text-gray-600 text-center">Creer un compte</p>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1" for="username">Pseudo</label>
                <input 
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  id="username"
                  type="text"
                  placeholder="Votre pseudo"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1" for="mail">Email</label>
                <input 
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  id="mail"
                  type="mail"
                  placeholder="Votre email"
                >
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1" for="password">Mot de passe</label>
                <input 
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  id="password"
                  type="password"
                  placeholder="••••••••"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1" for="password">Confirmer le mot de passe</label>
                <input 
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  id="confirm_password"
                  type="password"
                  placeholder="••••••••"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1" for="password">Avatar</label>
                <input 
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  id="avatar"
                  type="file"
                  placeholder="••••••••"
                >
              </div>
              <div class="flex items-center justify-between">
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
        this.setupEventListeners();
    }

    public destroy(): void {
        if (this.form) {
            this.form.removeEventListener('submit', this.handleSubmit);
        }
        this.section.remove();
    }

    private setupEventListeners(): void {
        this.form = this.section.querySelector('#register-form');
        this.form?.addEventListener('submit', this.handleSubmit);
    }

    private handleSubmit = (e: Event): void => {
        e.preventDefault();
        // Validation et envoi des données
        console.log("Formulaire d'inscription soumis");
        // Redirection après inscription réussie
        window.history.pushState({}, '', '/welcome');
        window.dispatchEvent(new PopStateEvent('popstate'));
    };
}
