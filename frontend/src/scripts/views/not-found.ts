export class NotFoundView {
    private message: string;

    constructor(message?: string) {
        this.message = message || 'La page demandée est introuvable.';
    }

    render(container: HTMLElement) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20">
                <h1 class="text-4xl font-bold text-red-600 mb-4">404</h1>
                <h2 class="text-xl text-gray-800 mb-2">Page non trouvée</h2>
                <p class="text-gray-600 mb-6">${this.message}</p>
                <a href="/" data-link class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Retour à l'accueil
                </a>
            </div>
        `;
    }
}