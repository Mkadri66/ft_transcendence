import Chart from 'chart.js/auto';

export class DashboardView {
    private section: HTMLElement;
    private ratioChart?: Chart;

    constructor() {
        this.section = document.createElement('section');
        this.section.className = 'dashboard';
        this.section.innerHTML = this.getHtml();
        this.setupEventListeners();
    }

    public getHtml(): string {
        return `
            <div class="dashboard-header flex justify-between items-center mb-8 p-4 bg-white rounded-lg shadow">
                <h1 class="text-3xl font-bold text-gray-800">Tableau de bord</h1>
            </div>

            <div class="dashboard-content grid grid-cols-1 md:grid-cols-2 gap-6">
    

            <!-- Dernières parties -->
            <div class="bg-white rounded-lg shadow p-6 min-h-[300px] max-h-[400px] overflow-auto">
                <h2 class="text-xl font-semibold mb-4">Mes 5 dernières parties</h2>
                <ul id="last-games" class="space-y-2 text-gray-700"></ul>
            </div>

            <!-- Ratio tournois -->
            <div class="bg-white rounded-lg shadow p-6 min-h-[300px] max-h-[400px] overflow-auto">
                <h2 class="text-xl font-semibold mb-4">Ratio Tournois Gagnés/Perdus</h2>
                <canvas id="tournament-ratio-chart" class="w-full h-35"></canvas>
            </div>

            <!-- Amis récents -->
            <div class="bg-white rounded-lg shadow p-6 min-h-[300px] max-h-[400px] overflow-auto">
                <h2 class="text-xl font-semibold mb-4">Ajouts d'amis récents</h2>
                <ul id="recent-friends" class="space-y-2 text-gray-700"></ul>
            </div>

            <!-- Suggestions d'amis -->
            <div class="bg-white rounded-lg shadow p-6 min-h-[300px] max-h-[400px] overflow-auto">
                <h2 class="text-xl font-semibold mb-4">Suggestions d'amis</h2>
                <ul id="suggested-friends" class="space-y-2 text-gray-700"></ul>
            </div>

            </div>
  `;
    }

    public render(container: HTMLElement): void {
        container.appendChild(this.section);
        this.loadDashboardData();
    }

    public destroy(): void {
        this.teardownEventListeners();
        this.section.remove();
    }

    private setupEventListeners(): void {
        this.section
            .querySelector('.refresh-button')
            ?.addEventListener('click', this.handleRefresh);

        // Exemple d'écouteur pour les lignes du tableau
        const table = this.section.querySelector('#user-table');
        table?.addEventListener('click', this.handleTableClick);
    }

    private teardownEventListeners(): void {
        this.section
            .querySelector('.refresh-button')
            ?.removeEventListener('click', this.handleRefresh);

        const table = this.section.querySelector('#user-table');
        table?.removeEventListener('click', this.handleTableClick);
    }

    private handleRefresh = (): void => {
        console.log('Actualisation des données...');
        this.loadDashboardData();
    };

    private handleTableClick = (event: Event): void => {
        const target = event.target as HTMLElement;
        if (target.classList.contains('action-button')) {
            const userId = target.dataset.userId;
            console.log(`Action sur l'utilisateur ${userId}`);
            // this.navigateTo(`/user/${userId}`);
        }
    };

    private updateLastGames(
        games: Array<{ id: number; game_name: string; result: string }>
    ): void {
        const list = this.section.querySelector('#last-games')!;
        list.innerHTML = '';

        if (games.length === 0) {
            const li = document.createElement('li');
            li.innerHTML = `
            <div class="text-gray-600 px-10 py-10">
                Aucune partie jouée pour le moment.
                <button id="create-tournament" class="ml-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Créer un tournoi
                </button>
            </div>
        `;
            list.appendChild(li);

            // Ajouter l'événement sur le bouton
            const btn = li.querySelector('#create-tournament')!;
            btn.addEventListener('click', () => {
                console.log('Créer un tournoi');
                // Rediriger vers la page de création de tournoi
                window.location.href = '/create-tournament';
            });
            return;
        }

        games.forEach((g) => {
            const li = document.createElement('li');
            li.textContent = `${g.game_name} – ${g.result}`;
            list.appendChild(li);
        });
    }

    private async loadDashboardData(): Promise<void> {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/dashboard`,
                {
                    method: 'GET',
                    credentials: 'include',
                }
            );

            if (response.status === 401) {
                window.location.href = '/';
                return;
            }
            const data = await response.json();


            this.updateLastGames(data.lastGames);

            // Ratio tournois
            this.updateTournamentRatio(data.ratio);

            // Amis récents
            this.updateRecentFriends(data.recentFriends);

            // Suggestions d'amis
            this.updateSuggestedFriends(data.suggestedFriends);
        } catch (err) {
            console.error('Erreur dashboard:', err);
            this.showError();
        }
    }

    private updateTournamentRatio(data: {
        wins: number;
        losses: number;
    }): void {
        const container = this.section.querySelector(
            '#tournament-ratio-chart'
        ) as HTMLCanvasElement;

        // Supprimer le graphique existant si présent
        if (this.ratioChart) {
            this.ratioChart.destroy();
            this.ratioChart = undefined;
        }

        // Vérifier si aucun tournoi n'a été joué
        if (data.wins === 0 && data.losses === 0) {
            // Remplacer le canvas par un message
            const parent = container.parentElement!;
            container.style.display = 'none';

            let messageDiv = parent.querySelector(
                '.no-tournaments-message'
            ) as HTMLDivElement;
            if (!messageDiv) {
                messageDiv = document.createElement('div');
                messageDiv.className =
                    'no-tournaments-message text-gray-600 px-10 py-10';
                messageDiv.innerHTML = `
                Aucune partie jouée pour le moment.
                <button id="create-tournament-btn" class="ml-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Créer un tournoi
                </button>
            `;
                parent.appendChild(messageDiv);

                const btn = messageDiv.querySelector('#create-tournament-btn')!;
                btn.addEventListener('click', () => {
                    console.log('Créer un tournoi');
                    window.location.href = '/create-tournament';
                });
            }
            return;
        }

        // Réafficher le canvas si nécessaire
        container.style.display = '';

        // Créer le graphique normalement
        this.ratioChart = new Chart(container, {
            type: 'pie',
            data: {
                labels: ['Gagnés', 'Perdus'],
                datasets: [
                    {
                        data: [data.wins, data.losses],
                        backgroundColor: ['#10B981', '#EF4444'],
                    },
                ],
            },
        });

        // Supprimer le message s'il existe
        const oldMessage = container.parentElement!.querySelector(
            '.no-tournaments-message'
        );
        if (oldMessage) oldMessage.remove();
    }

    private updateRecentFriends(
        friends: Array<{ id: number; username: string }>
    ): void {
        const list = this.section.querySelector('#recent-friends')!;
        list.innerHTML = '';
        friends.forEach((f) => {
            const li = document.createElement('li');
            li.innerHTML = `
      <a href="/profile/${encodeURIComponent(f.username)}" 
         class="text-blue-600 hover:underline">
        ${f.username}
      </a>
    `;
            list.appendChild(li);
        });
    }

    private updateSuggestedFriends(
        friends: Array<{ id: number; username: string }>
    ): void {
        const list = this.section.querySelector('#suggested-friends')!;
        list.innerHTML = '';
        friends.forEach((f) => {
            const li = document.createElement('li');
            li.innerHTML = `
      <a href="/profile/${encodeURIComponent(f.username)}" 
         class="text-blue-600 hover:underline">
        ${f.username}
      </a>
    `;
            list.appendChild(li);
        });
    }

    private showError(): void {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = 'Erreur de chargement des données';
        this.section.appendChild(errorDiv);
    }
}
