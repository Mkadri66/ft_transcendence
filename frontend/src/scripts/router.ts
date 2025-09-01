import { HomeView } from './views/home';
import { AboutView } from './views/about';
import { ContactView } from './views/contact';
import { RegisterView } from './views/register';
import { LoginView } from './views/login';
import { MfaConfigureView } from './views/mfa-configure';
import { DashboardView } from './views/dashboard';
import { Navbar } from './components/navbar';
import { EditProfileView } from './views/edit-profile';
import { ResetPasswordView } from './views/reset-password';
import { ProfileView } from './views/profile';
import { NotFoundView } from './views/not-found';

type Route = {
    path: string;
    view: any;
    title: string;
    navItemClass?: string;
};

export class Router {
    private routes: Route[];
    private contentContainer: HTMLElement;
    private currentView: any;
    private navItems: NodeListOf<HTMLElement>;
    private homeView: HomeView = new HomeView();
    private navbarInstance: Navbar | null = null;

    public setNavbar(navbar: Navbar) {
        this.navbarInstance = navbar;
    }

    constructor() {
        this.routes = [
            {
                path: '/',
                view: HomeView,
                title: 'Accueil',
                navItemClass: 'nav-home',
            },
            {
                path: '/about',
                view: AboutView,
                title: 'À propos',
                navItemClass: 'nav-about',
            },
            {
                path: '/contact',
                view: ContactView,
                title: 'Contact',
                navItemClass: 'nav-contact',
            },
            {
                path: '/register',
                view: RegisterView,
                title: 'Créer un compte',
                navItemClass: 'nav-register',
            },
            {
                path: '/login',
                view: LoginView,
                title: 'Se connecter',
                navItemClass: 'nav-login',
            },
            {
                path: '/mfa-configure',
                view: MfaConfigureView,
                title: 'Configurer le MFA',
                navItemClass: 'nav-mfa-configure',
            },
            {
                path: '/dashboard',
                view: DashboardView,
                title: 'Dashboard',
                navItemClass: 'nav-mfa-dashboard',
            },
            {
                path: '/edit-profile',
                view: EditProfileView,
                title: 'Editer le profil',
                navItemClass: 'nav-mfa-edit-profile',
            },
            {
                path: '/reset-password',
                view: ResetPasswordView,
                title: 'Changer le mot de passe',
                navItemClass: 'nav-reset-password',
            },
            {
                path: '/profile/:username',
                view: ProfileView,
                title: 'Profil',
                navItemClass: 'nav-profile',
            },
        ];

        this.contentContainer = document.getElementById(
            'content'
        ) as HTMLElement;
        this.currentView = null;
        this.navItems = document.querySelectorAll('[data-nav-item]');

        this.initRouter();
    }

    private initRouter(): void {
        // Gestion des clics sur les liens
        document.addEventListener('click', (e: MouseEvent) => {
            const anchor = (e.target as HTMLElement).closest('a[href^="/"]');
            if (anchor && anchor.hasAttribute('data-link')) {
                e.preventDefault();
                this.navigateTo(anchor.getAttribute('href')!);
            }
        });

        window.addEventListener('popstate', this.handleNavigation.bind(this));

        this.handleInitialRoute();
    }

    private handleInitialRoute(): void {
        const path = window.location.pathname;
        this.handleNavigation();
    }

    public navigateTo(path: string): void {
        if (window.location.pathname !== path) {
            window.history.pushState({}, '', path);
            this.handleNavigation();
        }
    }

    private updateActiveNavItem(path: string): void {
        const navItems = document.querySelectorAll('[data-nav-item]');

        navItems.forEach((item) => {
            item.classList.remove('bg-gray-900', 'text-white', 'font-bold');
            item.classList.add(
                'text-gray-300',
                'hover:bg-gray-700',
                'hover:text-white',
                'transition'
            );
        });

        const route = this.routes.find(
            (r) => path === r.path || path.startsWith(r.path + '/')
        );

        if (route) {
            // 4. Mettre à jour l'item actif
            const activeItems = document.querySelectorAll(
                `.${route.navItemClass}`
            );
            activeItems.forEach((item) => {
                item.classList.add('bg-gray-900', 'text-white', 'font-bold');
                item.classList.remove(
                    'text-gray-300',
                    'hover:bg-gray-700',
                    'hover:text-white'
                );
            });
        }
    }

    private handleNavigation(): void {
        const path = window.location.pathname;
        const matched = this.matchRoute(path);

        if (!this.contentContainer) return;

        this.updateActiveNavItem(path);

        if (!matched) {
            this.showErrorView('');
            return;
        }

        const { route, params } = matched;

        if (
            this.currentView &&
            typeof this.currentView.destroy === 'function'
        ) {
            this.currentView.destroy();
        }

        try {
            this.currentView = new route.view(params); // 🔹 passer params ici
            if (route.path === '/' && this.currentView.getData) {
                this.currentView.getData();
            }
            this.contentContainer.innerHTML = '';
            this.currentView.render(this.contentContainer);
        } catch (error) {
            console.error('Erreur lors du rendu de la vue :', error);
            this.showErrorView(error);
        }
        document.title = route.title;

        if (this.navbarInstance) {
            this.navbarInstance.render();
        }

        window.scrollTo(0, 0);
    }

    private showErrorView(error: unknown): void {
        if (
            this.currentView &&
            typeof this.currentView.destroy === 'function'
        ) {
            this.currentView.destroy();
        }

        this.currentView = new NotFoundView(
            typeof error === 'string' && error
                ? error
                : "Cette page n'existe pas."
        );
        this.contentContainer.innerHTML = '';
        this.currentView.render(this.contentContainer);

        document.title = '404 - Page non trouvée';
    }

    private matchRoute(
        path: string
    ): { route: Route; params: Record<string, string> } | undefined {
        for (const route of this.routes) {
            if (route.path.includes(':')) {
                // ex: '/profile/:username'
                const routeParts = route.path.split('/');
                const pathParts = path.split('/');
                if (routeParts.length !== pathParts.length) continue;

                const params: Record<string, string> = {};
                let match = true;

                for (let i = 0; i < routeParts.length; i++) {
                    if (routeParts[i].startsWith(':')) {
                        const paramName = routeParts[i].slice(1);
                        params[paramName] = decodeURIComponent(pathParts[i]);
                    } else if (routeParts[i] !== pathParts[i]) {
                        match = false;
                        break;
                    }
                }

                if (match) return { route, params };
            } else if (route.path === path) {
                return { route, params: {} };
            }
        }
        return undefined;
    }
}
