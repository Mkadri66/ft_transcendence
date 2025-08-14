export class DashboardView {
    private section: HTMLElement;

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
  <button class="refresh-button px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
    Actualiser
  </button>
</div>

        <div class="dashboard-content space-y-6">
          <div class="stats-grid grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="stat-card p-6 bg-white rounded-lg shadow">
              <h3 class="text-lg font-medium text-gray-500 mb-2">Utilisateurs actifs</h3>
              <span id="active-users" class="text-2xl font-bold text-gray-800">0</span>
            </div>
            
            <div class="stat-card p-6 bg-white rounded-lg shadow">
              <h3 class="text-lg font-medium text-gray-500 mb-2">Nouveaux inscrits</h3>
              <span id="new-users" class="text-2xl font-bold text-gray-800">0</span>
            </div>
            
            <div class="stat-card p-6 bg-white rounded-lg shadow">
              <h3 class="text-lg font-medium text-gray-500 mb-2">Activité récente</h3>
              <span id="recent-activity" class="text-2xl font-bold text-gray-800">0</span>
            </div>
          </div>

          <div class="data-table bg-white rounded-lg shadow overflow-hidden">
            <table id="user-table" class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <!-- Les lignes seront ajoutées dynamiquement -->
              </tbody>
            </table>
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

    private async loadDashboardData(): Promise<void> {
        const jwtToken = localStorage.getItem('jwtToken');
        if (!jwtToken) {
            window.history.pushState({}, '', '/login');
            window.dispatchEvent(new PopStateEvent('popstate'));
            return;
        }

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/auth/api/validate-token`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${jwtToken}`,
                    },
                }
            );

            if (!response.ok) {
                window.history.pushState({}, '', '/login');
                window.dispatchEvent(new PopStateEvent('popstate'));
                return;
            }

            // Continue with your dashboard data loading...
        } catch (error) {
            console.error('Token validation failed:', error);
            window.history.pushState({}, '', '/login');
            window.dispatchEvent(new PopStateEvent('popstate'));
        }
    }

    private updateStats(data: {
        activeUsers: number;
        newUsers: number;
        recentActivity: number;
    }): void {
        this.section.querySelector('#active-users')!.textContent =
            data.activeUsers.toString();
        this.section.querySelector('#new-users')!.textContent =
            data.newUsers.toString();
        this.section.querySelector('#recent-activity')!.textContent =
            data.recentActivity.toString();
    }

    private populateUserTable(
        users: Array<{ id: string; name: string; email: string }>
    ): void {
        const tbody = this.section.querySelector('#user-table tbody')!;
        tbody.innerHTML = '';

        users.forEach((user) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>
                    <button class="action-button" data-user-id="${user.id}">
                        Voir
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    private showError(): void {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = 'Erreur de chargement des données';
        this.section.appendChild(errorDiv);
    }
}
