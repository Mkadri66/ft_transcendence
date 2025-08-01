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
      <h1>À propos</h1>
      <div class="content">
        <p>Informations sur notre application.</p>
        <button class="cta-button">En savoir plus</button>
      </div>
      <div class="stats">
        <div class="stat-item">Utilisateurs: <span id="user-count">0</span></div>
      </div>
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
            const response = await fetch('/api/stats');
            const data = await response.json();
            this.section.querySelector('#user-count')!.textContent =
                data.userCount;
        } catch (error) {
            console.error('Erreur de chargement des données', error);
        }
    }
}
