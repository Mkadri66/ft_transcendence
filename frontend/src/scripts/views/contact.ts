export class ContactView {
    private section: HTMLElement;

    constructor() {
        this.section = document.createElement('section');
        this.section.className = 'contact';
        this.section.innerHTML = this.getHtml();
    }

    public getHtml(): string {
        return `
        <div class="max-w-4xl mx-auto px-4 py-12">
          <!-- En-tête -->
          <div class="text-center mb-12">
            <h1 class="text-3xl md:text-4xl font-bold text-gray-800 mb-4">Contactez-nous</h1>
            <p class="text-lg text-gray-600 max-w-2xl mx-auto">
              Une question, une suggestion ? Nous sommes à votre écoute.
            </p>
          </div>

          <!-- Formulaire -->
          <form id="contact-form" class="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8 space-y-6">
            <!-- Nom -->
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700" for="name">Nom</label>
              <input
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                id="name"
                type="text"
                placeholder="Votre nom complet"
                required
              >
            </div>

            <!-- Email -->
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700" for="email">Email</label>
              <input
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                id="email"
                type="email"
                placeholder="votre@email.com"
                required
              >
            </div>

            <!-- Message -->
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700" for="message">Message</label>
              <textarea
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition min-h-[120px]"
                id="message"
                placeholder="Votre message..."
                required
              ></textarea>
            </div>

            <!-- Bouton -->
            <div class="pt-2">
              <button
                type="submit"
                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 transform hover:scale-[1.02] shadow-md"
              >
                Envoyer le message
              </button>
            </div>

            <!-- Feedback -->
            <div id="form-feedback" class="text-center text-sm"></div>
          </form>

          <!-- Informations supplémentaires -->
          <div class="max-w-md mx-auto mt-16 grid grid-cols-1 sm:grid-cols-2 gap-8 text-center">
            <div class="bg-gray-50 p-6 rounded-lg">
              <div class="text-blue-600 text-2xl mb-3">📧</div>
              <h3 class="font-medium text-gray-800 mb-1">Email</h3>
              <pP class="text-gray-600">contact@ponggame.com</pP
            </div>
            <div class="bg-gray-50 p-6 rounded-lg">
              <div class="text-blue-600 text-2xl mb-3">📍</div>
              <h3 class="font-medium text-gray-800 mb-1">Adresse</h3>
              <p class="text-gray-600">Paris, France</p>
            </div>
          </div>
        </div>
    `;
    }

    public render(container: HTMLElement): void {
        container.appendChild(this.section);
        this.setupEventListeners();
    }

    public destroy(): void {
        const form = this.section.querySelector(
            '#contact-form'
        ) as HTMLFormElement;
        form?.removeEventListener('submit', this.handleSubmit);
        this.section.remove();
    }

    private setupEventListeners(): void {
        const form = this.section.querySelector(
            '#contact-form'
        ) as HTMLFormElement;
        form.addEventListener('submit', this.handleSubmit);
    }

    private handleSubmit = async (e: Event): Promise<void> => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);

        try {
            // Simulation d'envoi
            await new Promise((resolve) => setTimeout(resolve, 1000));
            this.showFeedback('Message envoyé avec succès!', 'success');
            form.reset();
        } catch (error) {
            this.showFeedback("Erreur lors de l'envoi", 'error');
        }
    };

    private showFeedback(message: string, type: 'success' | 'error'): void {
        const feedback = this.section.querySelector(
            '#form-feedback'
        ) as HTMLElement;
        feedback.textContent = message;
        feedback.className = `feedback ${type}`;
    }
}
