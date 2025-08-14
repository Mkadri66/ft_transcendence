import { Router } from './router';
import { Navbar } from './components/navbar';

// src/app.ts
import config from 'src/config';
// Test ultime
// console.log('🔍 VITE_API_URL:', import.meta.env.VITE_API_URL)
// console.log('Tout import.meta.env:', import.meta.env)
class App {
    private router: Router;
    private navbar: Navbar;

    constructor() {
        this.router = new Router();
        this.navbar = new Navbar(this.router);

        // Donne la navbar au router
        this.router.setNavbar(this.navbar);

        this.init();
    }

    private init(): void {
        this.navbar.render();
    }
}

new App();
