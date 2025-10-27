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

            <div class="mb-8 p-6 bg-white rounded-lg shadow flex justify-between items-center">
                <h2 class="text-xl font-semibold text-gray-800">Créer un tournoi</h2>
                <a href="/tournament"
                data-link
                class="px-4 py-2 bg-blue-500 text-white rounded-md shadow hover:bg-blue-600 transition-colors duration-200">
                Créer
                </a>
            </div>
            
            <div class="dashboard-content grid grid-cols-1 md:grid-cols-2 gap-6">
    

            <!-- Dernières parties -->
            <div class="bg-white rounded-lg shadow p-6 min-h-[300px] max-h-[400px] overflow-auto">
                <h2 class="text-xl font-semibold mb-4">Mes 5 dernières parties</h2>
                <ul id="last-games" class="space-y-2 text-gray-700"></ul>
            </div>

            <!-- Ratio tournois -->
            <div class="bg-white rounded-lg shadow p-6 min-h-[300px] max-h-[400px] overflow-hidden">
                <h2 class="text-xl font-semibold mb-4">Ratio Tournois Gagnés/Perdus</h2>
                <canvas id="tournament-ratio-chart" height="500px"class="w-full h-10"></canvas>
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

            <!-- Utilisateurs bloqués -->
            <div class="bg-white rounded-lg shadow p-6 min-h-[300px] max-h-[400px] overflow-auto">
                <h2 class="text-xl font-semibold mb-4">Utilisateurs bloqués</h2>
                <ul id="blocked-users" class="space-y-2 text-gray-700"></ul>
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
        games: Array<{
            id: number;
            game_name: string;
            result: string;
            my_score?: number | null;
            opponent_name?: string | null;
            opponent_score?: number | null;
        }>
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
                window.history.pushState({}, '', '/tournament');
                window.dispatchEvent(new PopStateEvent('popstate'));
            });
            return;
        }

        games.forEach((g) => {
            const li = document.createElement('li');

            const opponent = g.opponent_name || 'Adversaire';
            const myScore =
                g.my_score !== null && g.my_score !== undefined
                    ? String(g.my_score)
                    : '-';
            const oppScore =
                g.opponent_score !== null && g.opponent_score !== undefined
                    ? String(g.opponent_score)
                    : '-';

            // Format : "GameName - Résultat - myScore - oppScore contre opponentName"
            const mainText = `${g.game_name} - ${g.result} - ${myScore} - ${oppScore} contre ${opponent}`;

            li.innerHTML = `
                <div class="flex justify-between items-center py-2">
                    <div>
                        <div class="font-medium text-gray-800">${mainText}</div>
                    </div>
                    <div class="text-sm ${
                        g.result === 'Victoire'
                            ? 'text-green-600'
                            : 'text-red-600'
                    }">
                        ${g.result}
                    </div>
                </div>
            `;
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

            // Utilisateurs bloqués
            this.updateBlockedUsers(data.blockedUsers);
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
                    window.history.pushState({}, '', '/tournament');
                    window.dispatchEvent(new PopStateEvent('popstate'));
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
        friends: Array<{ id: number; username: string; avatar?: string }>
    ): void {
        const list = this.section.querySelector('#recent-friends')!;
        list.innerHTML = '';
        friends.forEach((f) => {
            const li = document.createElement('li');
            if (!f.avatar) {
                f.avatar = 'avatar.png'; // Utiliser une image par défaut si aucune avatar n'est fourni
            }
            li.innerHTML = `
      <div class="flex items-center justify-between py-2">
        <div class="flex items-center gap-3">
          <img src="${import.meta.env.VITE_API_URL}/uploads/${f.avatar}" alt="${
                f.username
            }" class="w-10 h-10 rounded-full object-cover">
          <a href="/profile/${encodeURIComponent(f.username)}" 
             class="text-blue-600 hover:underline">
            ${f.username}
          </a>
        </div>
        <button class="remove-friend-btn px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors" data-friend-id="${
            f.id
        }">
          Retirer
        </button>
      </div>
    `;
            list.appendChild(li);

            const removeBtn = li.querySelector('.remove-friend-btn')!;
            removeBtn.addEventListener('click', () => {
                this.handleRemoveFriend(f.username);
            });
        });
    }

    private updateSuggestedFriends(
        friends: Array<{ id: number; username: string; avatar?: string }>
    ): void {
        const list = this.section.querySelector('#suggested-friends')!;
        list.innerHTML = '';
        friends.forEach((f) => {
            const li = document.createElement('li');
            if (!f.avatar) {
                f.avatar = 'avatar.png'; // Utiliser une image par défaut si aucune avatar n'est fourni
            }

            li.innerHTML = `
      <div class="flex items-center justify-between py-2">
        <div class="flex items-center gap-3">
            <img src="${import.meta.env.VITE_API_URL}/uploads/${
                f.avatar
            }" alt="${f.username}" class="w-10 h-10 rounded-full object-cover">
          <a href="/profile/${encodeURIComponent(f.username)}" 
             class="text-blue-600 hover:underline">
            ${f.username}
          </a>
        </div>
        <button class="add-friend-btn px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors" data-friend-id="${
            f.username
        }">
          Ajouter
        </button>
      </div>
    `;
            list.appendChild(li);

            const addBtn = li.querySelector('.add-friend-btn')!;
            addBtn.addEventListener('click', () => {
                this.handleAddFriend(f.username);
            });
        });
    }

    private updateBlockedUsers(
        users: Array<{ id: number; username: string; avatar?: string }>
    ): void {
        const list = this.section.querySelector('#blocked-users')!;
        list.innerHTML = '';

        if (users.length === 0) {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="text-gray-600 px-4 py-4 text-center">
                    Aucun utilisateur bloqué
                </div>
            `;
            list.appendChild(li);
            return;
        }

        users.forEach((u) => {
            const li = document.createElement('li');
            const avatarUrl = u.avatar
                ? `${import.meta.env.VITE_API_URL}/uploads/${u.avatar}`
                : `${import.meta.env.VITE_API_URL}/uploads/avatar.png`;

            li.innerHTML = `
                <div class="flex items-center justify-between py-2">
                    <div class="flex items-center gap-3">
                        <img src="${avatarUrl}" alt="${u.username}" class="w-10 h-10 rounded-full object-cover">
                        <span class="text-gray-700">${u.username}</span>
                    </div>
                    <button class="unblock-user-btn px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 transition-colors" data-username="${u.username}">
                        Débloquer
                    </button>
                </div>
            `;
            list.appendChild(li);

            const unblockBtn = li.querySelector('.unblock-user-btn')!;
            unblockBtn.addEventListener('click', () => {
                this.handleUnblockUser(u.username);
            });
        });
    }

    private async handleAddFriend(friendUsername: string): Promise<void> {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/friends/add`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ username: friendUsername }),
                }
            );

            if (response.ok) {
                this.loadDashboardData();
            } else {
                console.error("Erreur lors de l'ajout de l'ami");
            }
        } catch (err) {
            console.error('Erreur:', err);
        }
    }

    private async handleRemoveFriend(friendUsername: string): Promise<void> {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/friends/remove`,
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ username: friendUsername }),
                }
            );

            if (response.ok) {
                this.loadDashboardData();
            } else {
                console.error("Erreur lors de la suppression de l'ami");
            }
        } catch (err) {
            console.error('Erreur:', err);
        }
    }

    private async handleUnblockUser(username: string): Promise<void> {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/blocked/remove`,
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ username }),
                }
            );

            if (response.ok) {
                this.loadDashboardData();
            } else {
                console.error('Erreur lors du déblocage');
            }
        } catch (err) {
            console.error('Erreur:', err);
        }
    }

    private showError(): void {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = 'Erreur de chargement des données';
        this.section.appendChild(errorDiv);
    }
}
