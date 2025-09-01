export class AboutView {
    private section: HTMLElement;

    constructor() {
        this.section = document.createElement('section');
        this.section.className = 'about';
        this.section.innerHTML = this.getHtml();
        this.setupEventListeners();
    }

    public getHtml(): string {
        return `
        <section class="max-w-4xl mx-auto px-6 py-16">

            <h1 class="text-4xl font-extrabold text-center text-gray-900 mb-6">À propos de Pong</h1>

            <div class="content text-center text-lg text-gray-700 mb-12">
                <p class="mb-4">
                Pong est l’un des tout premiers jeux vidéo d’arcade, sorti en 1972 et créé par Atari.
                C’est un jeu de simulation de tennis de table où deux joueurs contrôlent chacun une raquette
                pour renvoyer la balle de l’autre côté de l’écran.
                </p>
                <p>
                Notre version modernisée de Pong reprend le principe classique, avec des améliorations
                visuelles, un mode multijoueur et une interface adaptée aux technologies actuelles.
                </p>
            </div>


            <div class="stats grid grid-cols-1 sm:grid-cols-3 gap-6 text-center mb-12">
                <div class="stat-item bg-white shadow-lg rounded-2xl p-6">
                <p class="text-3xl font-bold text-blue-600" id="user-count">128</p>
                <p class="text-gray-600">Joueurs actifs</p>
                </div>
                <div class="stat-item bg-white shadow-lg rounded-2xl p-6">
                <p class="text-3xl font-bold text-green-600">1972</p>
                <p class="text-gray-600">Année de création</p>
                </div>
                <div class="stat-item bg-white shadow-lg rounded-2xl p-6">
                <p class="text-3xl font-bold text-purple-600">∞</p>
                <p class="text-gray-600">Possibilités de fun</p>
                </div>
            </div>

        </section>
    `;
    }

    public render(container: HTMLElement): void {
        container.appendChild(this.section);
        this.loadData(); // Chargement asynchrone des données
    }

    public destroy(): void {
        // Nettoyage avant suppression de la vue
        this.teardownEventListeners();
        this.section.remove();
    }

    private setupEventListeners(): void {
        this.section
            .querySelector('.cta-button')
            ?.addEventListener('click', this.handleButtonClick);
    }

    private teardownEventListeners(): void {
        this.section
            .querySelector('.cta-button')
            ?.removeEventListener('click', this.handleButtonClick);
    }

    private handleButtonClick = (): void => {
        alert('Vous avez cliqué sur le bouton !');
        // Ou this.navigateTo('/details');
    };

    private async loadData(): Promise<void> {
        try {
            fetch('http://localhost:3000')
                .then((response) => response.json()) // transforme la réponse en JSON
                .then((data) => {
                    console.log('Contenu:', data); // ici tu as accès au corps de la réponse
                })
                .catch((error) => {
                    console.error('Erreur fetch:', error);
                });
        } catch (error) {
            console.error('Erreur de chargement des données', error);
        }
    }
}
