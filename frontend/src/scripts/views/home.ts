export class HomeView {
    private section: HTMLElement;

    constructor() {
        this.section = document.createElement('section');
        this.section.className = 'home';
        this.section.innerHTML = this.getHtml();
    }

    public getHtml(): string {
        return `
        <div class="min-h-screen bg-white text-gray-900 py-20 px-6">
          <!-- Hero Section -->
          <div class="max-w-4xl mx-auto text-center mb-20">
            <h1 class="text-5xl md:text-7xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-700">
              Pong Game 
            </h1>
            <p class="text-xl md:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Redecouvrez le jeu mythique
            </p>
            <div class="flex flex-col sm:flex-row justify-center gap-4">
              <a href="/register" data-link class="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold py-3 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg">
                S'inscrire
              </a>
              <a href="/login" data-link class="border-2 border-blue-600 hover:bg-blue-50 text-blue-600 font-bold py-3 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105">
                Se connecter
              </a>
            </div>
          </div>

          <!-- Features Section -->
          <div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
            <div class="bg-gray-50 p-8 rounded-xl border border-gray-200 hover:border-blue-400 transition-all duration-300 hover:transform hover:-translate-y-2 shadow-sm hover:shadow-md">
              <div class="text-blue-600 text-3xl mb-4">🎮</div>
              <h3 class="text-2xl font-bold mb-3 text-gray-800">Simple</h3>
              <p class="text-gray-600">Interface intuitive</p>
            </div>
            <div class="bg-gray-50 p-8 rounded-xl border border-gray-200 hover:border-indigo-400 transition-all duration-300 hover:transform hover:-translate-y-2 shadow-sm hover:shadow-md">
              <div class="text-indigo-600 text-3xl mb-4">⚡</div>
              <h3 class="text-2xl font-bold mb-3 text-gray-800">Rapide</h3>
              <p class="text-gray-600">Chargement instantané</p>
            </div>
          </div>
        </div>
    `;
    }

    public render(container: HTMLElement): void {
        container.appendChild(this.section);
    }

    public destroy(): void {
        this.section.remove();
    }

    // public async getData(): Promise<void> {
    //     const url = 'http://localhost:3000';
    //     try {
    //         const response = await fetch(url);
    //         if (!response.ok) {
    //             throw new Error(`Response status: ${response.status}`);
    //         }

    //         const result = await response.json();
    //         console.log(result);
    //     } catch (error) {
    //       const e = error as Error;
    //       alert(e.message);
    //     }
    // }
}
