import { Router } from '../router';

export class Navbar {
    private router: Router;

    constructor(router: Router) {
        this.router = router;
    }

    public render(): void {
        const navbarContainer = document.getElementById('navbar');
        if (!navbarContainer) return;

        navbarContainer.innerHTML = `
          <nav class="bg-gray-800 p-4">
            <div class="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
              <div class="relative flex items-center justify-between h-16">
                <!-- Votre logo ici -->
                
                <div class="flex-1 flex items-center justify-center sm:items-stretch sm:justify-start">
                  <div class="hidden sm:block sm:ml-6">
                    <div class="flex space-x-4">
                      <a href="/" 
                          data-link
                          data-nav-item
                          class="nav-home px-3 py-2 rounded-md text-base font-medium text-white bg-gray-900">
                        Accueil
                      </a>
                      <a href="/about" 
                          data-link
                          data-nav-item
                          class="nav-about px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white">
                        À propos
                      </a>

                      <a href="/contact" 
                          data-link
                          data-nav-item
                          class="nav-contact px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white">
                        Contact
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </nav>

      
          <div class="flex items-center space-x-4">
            <!-- Bouton "Créer un compte" - Blanc avec texte noir -->
            <a href="/register" 
              data-link
              data-nav-item
              class="nav-register px-4 py-2 rounded-md text-base font-medium bg-blue-500 text-white border-1 border-white transition-colors duration-200">
              Créer un compte
            </a>

            <!-- Bouton "Se connecter" - Transparent avec bordure blanche -->
            <a href="/login" 
              data-link
              data-nav-item
              class="nav-login px-4 py-2 rounded-md text-base font-medium text-white border-1 border-white transition-colors duration-200">
              Se connecter
            </a>
          </div>
    `;
    }
}
