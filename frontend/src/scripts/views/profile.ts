import Chart from 'chart.js/auto';

type FriendsRank = { username: string; points: number };

export class ProfileView {
    private section: HTMLElement;
    private username: string;
    private avatarImg: HTMLImageElement | null;
    private errorBox: HTMLElement | null;
    private charts: { victoryPie?: Chart; rankingBar?: Chart } = {};

    constructor(params: { username: string }) {
        this.section = document.createElement('section');
        this.section.className = 'profile';
        this.username = params.username;
        this.section.innerHTML = this.getHtml();
        this.avatarImg = null;
        this.errorBox = null;
    }

    private getHtml(): string {
        return `
    <div class="max-w-5xl mx-auto bg-white rounded-2xl shadow p-8 space-y-8">
      <!-- Header -->
      <div class="space-y-2 text-center">
        <h2 class="text-3xl font-bold text-gray-900">Profil</h2>
        <p class="text-gray-600">Statistiques et informations</p>
      </div>

      <!-- Avatar + Username -->
      <div class="flex flex-col items-center space-y-4">
        <img src="/uploads/avatar.png" alt="Avatar" class="w-40 h-40 rounded-full object-cover ring-2 ring-gray-200" id="profile-avatar">
        <h3 id="profile-username" class="text-xl font-semibold text-gray-800"></h3>
      </div>
    <div class="flex justify-center mt-4">
    <button 
        id="friend-btn" 
        class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
        Vérification...
    </button>
    </div>
      <!-- Stats globales -->
      <div id="stats-container" class="grid grid-cols-3 gap-4 text-center text-gray-700">
        <div class="bg-gray-50 rounded-xl p-4">
          <p class="text-3xl font-bold" id="wins">0</p>
          <p class="text-sm text-gray-500">Victoires</p>
        </div>
        <div class="bg-gray-50 rounded-xl p-4">
          <p class="text-3xl font-bold" id="losses">0</p>
          <p class="text-sm text-gray-500">Défaites</p>
        </div>
        <div class="bg-gray-50 rounded-xl p-4">
          <p class="text-3xl font-bold" id="tournaments">0</p>
          <p class="text-sm text-gray-500">Tournois</p>
        </div>
      </div>

      <!-- Graphiques -->
    <div class="space-y-4 mx-auto max-w-4xl">
    <h4 class="text-lg font-semibold text-gray-900 text-center">Graphiques</h4>
    <div class="grid grid-cols-1 md:grid-cols-1">
        <!-- Pie -->
        <div class="bg-gray-50 rounded-xl shadow p-4 h-80 flex items-center justify-center">
        <canvas id="victoryPie" class="w-full h-full"></canvas>
        </div>
        <!-- Ranking (hidden if empty) -->
        <div id="rankingCard" class="bg-gray-50 rounded-xl shadow p-4 h-80 hidden flex items-center justify-center">
        <canvas id="rankingBar" class="w-full h-full"></canvas>
        </div>
    </div>
    </div>

      <!-- Error -->
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mt-2 rounded relative hidden" role="alert">
        <span class="block xl:inline"></span>
        <button type="button" class="absolute top-2 right-2 text-red-600" id="close-error">✕</button>
      </div>
    </div>
    `;
    }

    public async render(container: HTMLElement): Promise<void> {
        container.appendChild(this.section);
        this.avatarImg = this.section.querySelector('#profile-avatar');
        this.errorBox = this.section.querySelector('[role="alert"]');

        const closeBtn = this.section.querySelector('#close-error');
        if (closeBtn) {
            closeBtn.addEventListener('click', () =>
                this.errorBox?.classList.add('hidden')
            );
        }

        try {
            await this.fetchProfileData();
            await this.checkFriendship();
        } catch (error: any) {
            console.error(error);
            this.showError(error.message); // <- on envoie le message réel
        }
    }

    private async checkFriendship() {
        const btn = this.section.querySelector(
            '#friend-btn'
        ) as HTMLButtonElement;
        if (!btn) return;

        const updateButton = (areFriends: boolean) => {
            if (areFriends) {
                btn.textContent = 'Supprimer ❌';
                btn.className =
                    'px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600';
            } else {
                btn.textContent = 'Ajouter en ami ➕';
                btn.className =
                    'px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600';
            }
        };

        const fetchStatus = async () => {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/friends/check/${
                    this.username
                }`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem(
                            'jwtToken'
                        )}`,
                    },
                }
            );

            if (!response.ok) {
                console.error('Erreur vérif amis');
                return false;
            }

            const data = await response.json();
            updateButton(data.areFriends);
            return data.areFriends;
        };

        let areFriends = await fetchStatus();

        btn.onclick = async () => {
            if (areFriends) {
                // Suppression
                const res = await fetch(
                    `${import.meta.env.VITE_API_URL}/friends/remove`,
                    {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${localStorage.getItem(
                                'jwtToken'
                            )}`,
                        },
                        body: JSON.stringify({ username: this.username }),
                    }
                );

                if (res.ok) {
                    areFriends = false;
                    updateButton(false);
                }
            } else {
                // Ajout
                const res = await fetch(
                    `${import.meta.env.VITE_API_URL}/friends/add`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${localStorage.getItem(
                                'jwtToken'
                            )}`,
                        },
                        body: JSON.stringify({ username: this.username }),
                    }
                );

                if (res.ok) {
                    areFriends = true;
                    updateButton(true);
                }
            }
        };
    }

    private async fetchProfileData(): Promise<void> {
        const response = await fetch(
            `${import.meta.env.VITE_API_URL}/profile/${this.username}`,
            { method: 'GET', headers: { 'Content-Type': 'application/json' } }
        );

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('NOT_FOUND');
            }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Profil introuvable');
        }

        const userData = await response.json();
        this.updateUI(userData);
    }

    private updateUI(userData: any): void {
        // Username + avatar
        const usernameEl = this.section.querySelector('#profile-username');
        if (usernameEl)
            usernameEl.textContent = userData.username ?? this.username;

        if (this.avatarImg) {
            const avatarFile = userData.avatar || 'avatar.png';
            this.avatarImg.src = `${
                import.meta.env.VITE_API_URL
            }/uploads/${avatarFile}`;
        }

        // Stats numbers
        const wins = userData?.stats?.wins ?? 0;
        const losses = userData?.stats?.losses ?? 0;
        const tournamentsWon = userData?.totalTournamentsWon ?? 0;

        (this.section.querySelector('#wins') as HTMLElement).textContent =
            String(wins);
        (this.section.querySelector('#losses') as HTMLElement).textContent =
            String(losses);
        (
            this.section.querySelector('#tournaments') as HTMLElement
        ).textContent = String(tournamentsWon);

        // Charts
        this.renderCharts({
            wins,
            losses,
            friendsRanking: (userData?.friendsRanking ?? []) as FriendsRank[],
        });
    }

    private renderCharts(data: {
        wins: number;
        losses: number;
        friendsRanking: FriendsRank[];
    }) {
        // Destroy old charts to prevent overlay
        if (this.charts.victoryPie) this.charts.victoryPie.destroy();
        if (this.charts.rankingBar) this.charts.rankingBar.destroy();

        // PIE / DOUGHNUT
        const pieCanvas = this.section.querySelector(
            '#victoryPie'
        ) as HTMLCanvasElement;
        const pieCtx = pieCanvas.getContext('2d');
        if (pieCtx) {
            this.charts.victoryPie = new Chart(pieCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Victoires', 'Défaites'],
                    datasets: [
                        {
                            data: [data.wins, data.losses],
                            backgroundColor: ['#22c55e', '#ef4444'],
                            borderWidth: 0,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // <- important for Tailwind card height
                    cutout: '60%',
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: { boxWidth: 16, boxHeight: 16 },
                        },
                        tooltip: { enabled: true },
                    },
                },
            });
        }

        // RANKING BAR (hide if no data)
        const rankingCard = this.section.querySelector(
            '#rankingCard'
        ) as HTMLElement;
        const hasRanking =
            Array.isArray(data.friendsRanking) &&
            data.friendsRanking.length > 0;

        if (!hasRanking) {
            rankingCard.classList.add('hidden');
            return;
        }
        rankingCard.classList.remove('hidden');

        const barCanvas = this.section.querySelector(
            '#rankingBar'
        ) as HTMLCanvasElement;
        const barCtx = barCanvas.getContext('2d');
        if (barCtx) {
            this.charts.rankingBar = new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: data.friendsRanking.map((f) => f.username),
                    datasets: [
                        {
                            label: 'Points',
                            data: data.friendsRanking.map((f) => f.points),
                            backgroundColor: '#3b82f6',
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // <- important
                    scales: {
                        x: {
                            ticks: { autoSkip: true, maxTicksLimit: 6 },
                            grid: { display: false },
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.05)' },
                        },
                    },
                    plugins: {
                        legend: { position: 'top' },
                        tooltip: { enabled: true },
                    },
                },
            });
        }
    }

    private showError(message: string): void {
        if (message === 'NOT_FOUND') {
            this.section.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20">
                <h2 class="text-3xl font-bold text-gray-900 mb-2">Profil introuvable</h2>
                <p class="text-gray-600 mb-6">Le joueur <span class="font-semibold">${this.username}</span> n'existe pas ou n'a pas encore de profil.</p>
                <a href="/dashboard" data-link 
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                    Retour au dashboard
                </a>
            </div>
        `;
            return;
        }

        // Cas générique (erreur serveur, etc.)
        if (!this.errorBox) return;
        const messageSpan = this.errorBox.querySelector('span.block');
        if (messageSpan) messageSpan.textContent = message;
        this.errorBox.classList.remove('hidden');
    }

    public destroy(): void {
        // clean charts
        if (this.charts.victoryPie) this.charts.victoryPie.destroy();
        if (this.charts.rankingBar) this.charts.rankingBar.destroy();
        this.section.remove();
    }
}
