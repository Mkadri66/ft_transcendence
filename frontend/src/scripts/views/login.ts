export class LoginView {
    private section: HTMLElement;
    private form: HTMLFormElement | null;

    constructor() {
        this.section = document.createElement('section');
        this.section.className = 'login';
        this.section.innerHTML = this.getHtml();
        this.form = null;
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
                  id="email"
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
                  id="password"
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
            </div>

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
    }

    public destroy(): void {
        this.section.remove();
    }
}
