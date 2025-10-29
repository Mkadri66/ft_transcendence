import { Router } from '../router';

export class Navbar {
    private router: Router;
    private isAuthenticated: boolean = false;
    private currentPath: string = '/';

    constructor(router: Router) {
        this.router = router;
        this.currentPath = window.location.pathname;

        // Écouter les changements de route
        window.addEventListener('popstate', () => {
            this.currentPath = window.location.pathname;
            this.updateActiveLink();
        });
    }

    public async render(): Promise<void> {
        const navbarContainer = document.getElementById('navbar');
        if (!navbarContainer) return;

        await this.checkAuthentication();
        this.currentPath = window.location.pathname;

        navbarContainer.innerHTML = this.generateNavbarHTML();
        this.setupEventListeners();
        this.updateActiveLink();
    }

    private async checkAuthentication(): Promise<void> {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/auth/api/validate-token`,
                {
                    method: 'GET',
                    credentials: 'include',
                }
            );

            if (response.ok) {
                const data = await response.json();
                this.isAuthenticated = data.valid;
            } else {
                this.isAuthenticated = false;
            }
        } catch (error) {
            this.isAuthenticated = false;
        }
    }

    private generateNavbarHTML(): string {
        return `
          <nav class="bg-gray-800 p-4">
            <div class="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
              <div class="relative flex items-center justify-between h-16">
                <!-- Logo/Home -->
                <div class="flex-1 flex items-center justify-center sm:items-stretch sm:justify-start">
                  <div class="hidden sm:block sm:ml-6">
                    <div class="flex space-x-4 mx-4">
                      <a href="/" 
                          data-link
                          data-nav-item="/"
                          class="nav-link px-3 py-2 rounded-md text-base font-medium">
                        Accueil
                      </a>
                      <a href="/about" 
                          data-link
                          data-nav-item="/about"
                          class="nav-link px-3 py-2 rounded-md text-base font-medium">
                        À propos
                      </a>
                      <a href="/contact" 
                          data-link
                          data-nav-item="/contact"
                          class="nav-link px-3 py-2 rounded-md text-base font-medium">
                        Contact
                      </a>
                      ${
                          this.isAuthenticated
                              ? `
                        <a href="/dashboard" 
                            data-link
                            data-nav-item="/dashboard"
                            class="nav-link px-3 py-2 rounded-md text-base font-medium">
                          Dashboard
                        </a>
                      `
                              : ''
                      }
                    </div>
                  </div>
                </div>

                <!-- Auth Links -->
                <div class="flex items-center space-x-4">
                  ${
                      this.isAuthenticated
                          ? `
                      <a href="/edit-profile" 
                        data-link
                        data-nav-item="/edit-profile"
                        class="nav-link px-4 py-2 rounded-md text-base font-medium bg-blue-500 text-white border border-white transition-colors duration-200 hover:bg-blue-600">
                        Éditer profil
                      </a>
                    <button id="logout-btn"
                      class="px-4 py-2 rounded-md text-base font-medium text-white border border-white transition-colors duration-200 hover:bg-red-500">
                      Se déconnecter
                    </button>
                    `
                          : `
                      <a href="/register" 
                        data-link
                        data-nav-item="/register"
                        class="nav-link px-4 py-2 rounded-md text-base font-medium bg-blue-500 text-white border border-white transition-colors duration-200 hover:bg-blue-600">
                        Créer un compte
                      </a>
                      <a href="/login" 
                        data-link
                        data-nav-item="/login"
                        class="nav-link px-4 py-2 rounded-md text-base font-medium text-white border border-white transition-colors duration-200 hover:bg-gray-700">
                        Se connecter
                      </a>
                    `
                  }
                </div>
              </div>
            </div>
          </nav>
        `;
    }

    private setupEventListeners(): void {
        if (this.isAuthenticated) {
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => this.handleLogout());
            }
        }

        // Écouter les clics sur les liens de navigation
        const navLinks = document.querySelectorAll('[data-nav-item]');
        navLinks.forEach((link) => {
            link.addEventListener('click', () => {
                this.currentPath = link.getAttribute('data-nav-item') || '/';
                setTimeout(() => this.updateActiveLink(), 0);
            });
        });
    }

    private updateActiveLink(): void {
        const navLinks = document.querySelectorAll('[data-nav-item]');

        navLinks.forEach((link) => {
            const linkPath = link.getAttribute('data-nav-item');

            if (linkPath === this.currentPath) {
                link.classList.remove(
                    'text-gray-300',
                    'hover:bg-gray-700',
                    'hover:text-white'
                );
                link.classList.add('text-white', 'bg-gray-900');
            } else {
                link.classList.remove('text-white', 'bg-gray-900');
                link.classList.add(
                    'text-gray-300',
                    'hover:bg-gray-700',
                    'hover:text-white'
                );
            }
        });
    }

    private async handleLogout(): Promise<void> {
        await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
        });

        this.isAuthenticated = false;
        this.currentPath = '/';
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
        this.render();
    }
}
