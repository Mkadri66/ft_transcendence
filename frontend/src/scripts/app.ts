import { Router } from './router'
import { Navbar } from './components/navbar';

class App {
    private router: Router;
    private navbar: Navbar;

    constructor() {
        this.router = new Router();
        this.navbar = new Navbar(this.router);

        this.init();
    }

    private init(): void {
        this.navbar.render();
        //this.router.loadInitialRoute();
    }
}

// Lancement de l'application
new App();
