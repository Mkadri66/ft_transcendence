import { HomeView } from './views/home';
import { AboutView } from './views/about';
import { ContactView } from './views/contact';
import { RegisterView } from './views/register';
import { LoginView } from './views/login';
import { MfaConfigureView } from './views/mfa-configure';
import { DashboardView } from './views/dashboard';
import { Navbar } from './components/navbar';

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
        const matchedRoute = this.matchRoute(path);

        if (!this.contentContainer) return;

        this.updateActiveNavItem(path);

        if (!matchedRoute) {
            this.showErrorView('');
            return;
        }

        if (
            this.currentView &&
            typeof this.currentView.destroy === 'function'
        ) {
            this.currentView.destroy();
        }

        try {
            this.currentView = new matchedRoute.view();
            if (matchedRoute.path === '/' && this.currentView.getData) {
                this.currentView.getData();
            }
            this.contentContainer.innerHTML = '';
            this.currentView.render(this.contentContainer);
        } catch (error) {
            console.error('Erreur lors du rendu de la vue :', error);
            this.showErrorView(error);
        }
        document.title = matchedRoute.title;

        // 🔹 Rafraîchir la navbar après le changement de vue
        if (this.navbarInstance) {
            this.navbarInstance.render();
        }

        window.scrollTo(0, 0);
    }

    private showErrorView(error: unknown): void {
        this.contentContainer.innerHTML = `
        <div style="padding:20px;color:red;">
            <h2>Une erreur est survenue</h2>
            <pre>${String(error)}</pre>
        </div>
    `;
    }

    private matchRoute(path: string): Route | undefined {
        return this.routes.find((route) => route.path === path);
    }
}
