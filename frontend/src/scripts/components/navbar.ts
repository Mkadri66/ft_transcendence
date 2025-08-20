import { Router } from '../router';

export class Navbar {
    private router: Router;
    private isAuthenticated: boolean = false;

    constructor(router: Router) {
        this.router = router;
    }

    public async render(): Promise<void> {
        const navbarContainer = document.getElementById('navbar');
        if (!navbarContainer) return;

        await this.checkAuthentication();

        navbarContainer.innerHTML = this.generateNavbarHTML();
        this.setupEventListeners();
    }

    private async checkAuthentication(): Promise<void> {
        const jwtToken = localStorage.getItem('jwtToken');
        if (!jwtToken) {
            this.isAuthenticated = false;
            return;
        }

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/auth/api/validate-token`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${jwtToken}`,
                    },
                }
            );

            this.isAuthenticated = response.ok;
            console.log(this.isAuthenticated);
        } catch (error) {
            console.error('Token validation failed:', error);
            this.isAuthenticated = false;
        }
    }

    private generateNavbarHTML(): string {
        return `
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
                      <a href="/dashboard" 
                          data-link
                          data-nav-item
                          class="nav-dashboard px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white">
                        Dashboard
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          <div class="flex items-center space-x-4">
            ${
                this.isAuthenticated
                    ? `
                    <a href="/edit-profile" 
                      data-link
                      data-nav-item
                      class="nav-edit px-4 py-2 rounded-md text-base font-medium bg-blue-500 text-white border-1 border-white transition-colors duration-200">
                      Éditer profil
                    </a>
                    <a href="/"
                      data-link
                      data-nav-item />
                      <button id="logout-btn"
                        class="px-4 py-2 rounded-md text-base font-medium text-white border-1 border-white transition-colors duration-200 hover:bg-red-500">
                        Se déconnecter
                      </button>
                    </a>
                  `
                    : `
                    <a href="/register" 
                      data-link
                      data-nav-item
                      class="nav-register px-4 py-2 rounded-md text-base font-medium bg-blue-500 text-white border-1 border-white transition-colors duration-200">
                      Créer un compte
                    </a>
                    <a href="/login" 
                      data-link
                      data-nav-item
                      class="nav-login px-4 py-2 rounded-md text-base font-medium text-white border-1 border-white transition-colors duration-200">
                      Se connecter
                    </a>
                  `
            }
          </div>
        `;
    }

    private setupEventListeners(): void {
        if (this.isAuthenticated) {
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => this.handleLogout());
            }
        }
    }

    private handleLogout(): void {
        localStorage.removeItem('jwtToken');
        this.isAuthenticated = false;
        this.render(); // Rafraîchit la navbar après déconnexion
    }
}
