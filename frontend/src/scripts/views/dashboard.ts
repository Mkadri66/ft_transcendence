import Chart from 'chart.js/auto';
import { chatService } from '../services/chat';

export class DashboardView {
    private section: HTMLElement;
    private ratioChart?: Chart;
	private currentConversation: string | null = null;
    private currentUsername: string | null = null;

    private _onWsMessage = (data: any) => this._handleWsMessage(data);
    private _onFriendsUpdated = () => this.loadDashboardData();

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
                <h2 class="text-xl font-semibold mb-2">Ratio Tournois Gagnés/Perdus</h2>
                <canvas id="tournament-ratio-chart"  width="200px" height="200px"class="w-full h-7 mb-4"></canvas>
            </div>

            <!-- Amis récents -->
            <div class="bg-white rounded-lg shadow p-6 min-h-[300px] max-h-[400px] overflow-auto">
                <h2 class="text-xl font-semibold mb-4">Ajouts d'amis récents</h2>
                <ul id="recent-friends" class="space-y-2 text-gray-700"></ul>
            </div>
			<!-- Demandes d'amis -->
			<div class="bg-white rounded-lg shadow p-6 min-h-[300px] max-h-[400px] overflow-auto">
    			<h2 class="text-xl font-semibold mb-4">Demandes d'amis reçues</h2>
    			<ul id="friend-requests" class="space-y-2 text-gray-700"></ul>
			</div>
			<!-- Demandes d'amis envoyées -->
			<div class="bg-white rounded-lg shadow p-6 min-h-[300px] max-h-[400px] overflow-auto">
			    <div class="flex justify-between items-center mb-4">
			        <h2 class="text-xl font-semibold">Demandes d'amis envoyées</h2>
			        <button id="add-friend-btn"
			                class="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors">
			            Ajouter un ami
			        </button>
			    </div>
			    <ul id="sent-friend-requests" class="space-y-2 text-gray-700"></ul>
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
			<!-- Messages -->
			<div class="bg-white rounded-lg shadow p-6 md:col-span-2">
			    <h2 class="text-xl font-semibold mb-4">Messages</h2>

			    <div class="flex h-[400px] border rounded-lg overflow-hidden">

			        <!-- Liste conversations -->
					<div id="conversation-list" class="w-1/3 border-r overflow-y-auto bg-gray-50 p-2">
					    <button id="new-conversation-btn"
					            class="w-full mb-2 px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition">
					        Nouvelle conversation
					    </button>
					    <ul id="conversation-items" class="space-y-1"></ul>
					</div>

			<!-- Chat actif -->
			        <div class="w-2/3 flex flex-col">

			            <!-- Conversation header -->
                        <div id="chat-header" class="px-4 py-2 border-b bg-white text-sm text-gray-700">
			                <span id="chat-partner-name" class="font-medium"></span>
			            </div>

			            <!-- Messages -->
			            <div id="messages-container"
			                 class="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
			            </div>

			            <!-- Input -->
			            <div class="flex gap-2 p-3 border-t bg-gray-50">
			                <input id="message-input"
			                       class="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
			                       placeholder="Écrire un message..." />

			                <button id="send-message-btn"
			                        class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition">
			                    Envoyer
			                </button>
			            </div>

			        </div>
			    </div>
			</div>
        </div>
	`;
    }

    public render(container: HTMLElement): void {
        container.appendChild(this.section);
        this.loadDashboardData();
		this.loadConversations();
        chatService.connect();
        chatService.on('message', this._onWsMessage);
        chatService.on('friends_updated', this._onFriendsUpdated);
    }

    public destroy(): void {
        this.teardownEventListeners();
        chatService.off('message', this._onWsMessage);
        chatService.off('friends_updated', this._onFriendsUpdated);
        this.section.remove();
    }

    private setupEventListeners(): void {
		const addFriendBtn = this.section.querySelector('#add-friend-btn');
		addFriendBtn?.addEventListener('click', this.handleAddFriendPrompt);

		const sendBtn = this.section.querySelector('#send-message-btn');
		sendBtn?.addEventListener('click', this.handleSendMessage);

		const newConvBtn = this.section.querySelector('#new-conversation-btn');
		newConvBtn?.addEventListener('click', this.handleNewConversation);
    }

    private teardownEventListeners(): void {
		const addFriendBtn = this.section.querySelector('#add-friend-btn');
		addFriendBtn?.removeEventListener('click', this.handleAddFriendPrompt);

		const sendBtn = this.section.querySelector('#send-message-btn');
		sendBtn?.removeEventListener('click', this.handleSendMessage);
    }

	private handleAddFriendPrompt = (): void => {
	    const username = prompt("Entrez le nom d'utilisateur à ajouter :");
	    if (!username || username.trim() === "") return;

	    this.handleAddFriend(username.trim());
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
                    : ' - ';
            const oppScore =
                g.opponent_score !== null && g.opponent_score !== undefined
                    ? String(g.opponent_score)
                    : '-';

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

            if (data.username) {
                this.currentUsername = data.username;
            }

            this.updateLastGames(data.lastGames);

            // Ratio tournois
            this.updateTournamentRatio(data.ratio);

            // Amis récents
            this.updateRecentFriends(data.recentFriends);

			// Demandes d'amis recues
			this.updateFriendRequests(data.friendRequests);

			// Demandes d'amis envoyees
			this.updateSentFriendRequests(data.friendRequestsSend);

			// Suggestions d'amis
            this.updateSuggestedFriends(data.suggestedFriends);

            // Utilisateurs bloqués
            this.updateBlockedUsers(data.blockedUsers);

        } catch (err) {
            console.error('Erreur dashboard:', err);
            this.showError();
        }
    }

	private loadConversations = async (): Promise<void> => {
	    try {
	        const res = await fetch(`${import.meta.env.VITE_API_URL}/messages/conversations`, {
	            credentials: 'include'
	        });
	        if (!res.ok) throw new Error('Erreur lors du chargement des conversations');
	        const data = await res.json();

	        const list = this.section.querySelector<HTMLUListElement>('#conversation-items');
	        if (!list) return;
	        list.innerHTML = '';

	        data.conversations.forEach((conv: { username: string }) => {
	            const li = document.createElement('li');
	            li.setAttribute('data-conv-username', conv.username);
                li.className = 'px-2 py-1 rounded hover:bg-blue-100 cursor-pointer';
	            li.innerHTML = `
                    <span>${conv.username}</span>
                `;
	            li.addEventListener('click', () => this.loadConversation(conv.username));
	            list.appendChild(li);
	        });
	    } catch (err) {
	        console.error(err);
	    }
	};
	private loadConversation = async (username: string): Promise<void> => {
	    try {
	        const res = await fetch(`${import.meta.env.VITE_API_URL}/messages/conversation/${username}`, {
	            credentials: 'include'
	        });
	        if (!res.ok) throw new Error('Erreur lors du chargement des messages');
	        const data = await res.json();

	        const container = this.section.querySelector<HTMLDivElement>('#messages-container');
	        if (!container) return;

	        container.innerHTML = '';
	        data.messages.forEach((msg: any) => {
	            const div = document.createElement('div');
	            div.textContent = `${msg.sender}: ${msg.content}`;
	            const isMine = this.currentUsername !== null
	                ? msg.sender === this.currentUsername
	                : msg.sender !== username;
	            div.className = isMine ? 'text-right font-medium text-blue-700' : 'text-left text-gray-800';
	            container.appendChild(div);
	        });

	        // Scroll automatique vers le bas
	        container.scrollTop = container.scrollHeight;

	        this.currentConversation = username;

            // Update chat header
            const partnerName = this.section.querySelector<HTMLElement>('#chat-partner-name');
            if (partnerName) partnerName.textContent = username;
	    } catch (err) {
	        console.error(err);
	    }
	};

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
            options: {
                maintainAspectRatio: false,
                radius: '80%',
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
	private updateFriendRequests(
	    requests: Array<{ id: number; sender_id: number; sender_name: string; sender_avatar?: string; status: string; created_at: string }>
	): void {
	    const list = this.section.querySelector('#friend-requests')!;
	    list.innerHTML = '';

	    if (requests.length === 0) {
	        const li = document.createElement('li');
	        li.innerHTML = `
	            <div class="text-gray-600 px-4 py-4 text-center">
	                Aucune demande en attente
	            </div>
	        `;
	        list.appendChild(li);
	        return;
	    }

	    requests.forEach((r) => {
			console.log(r.sender_name);
	        const li = document.createElement('li');

	        const avatarUrl = r.sender_avatar
	            ? `${import.meta.env.VITE_API_URL}/uploads/${r.sender_avatar}`
	            : `${import.meta.env.VITE_API_URL}/uploads/avatar.png`;

	        li.innerHTML = `
	            <div class="flex items-center justify-between py-2">
	                <div class="flex items-center gap-3">
	                    <img src="${avatarUrl}" class="w-10 h-10 rounded-full object-cover">
	                    <span class="text-gray-800">${r.sender_name}</span>
	                </div>
	                <div class="flex gap-2">
	                    <button class="accept-btn px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600">
	                        Accepter
	                    </button>
	                    <button class="reject-btn px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">
	                        Refuser
	                    </button>
	                </div>
	            </div>
	        `;

	        list.appendChild(li);

	        li.querySelector('.accept-btn')!
	            .addEventListener('click', () => this.handleAcceptFriend(r.sender_name));

	        li.querySelector('.reject-btn')!
	            .addEventListener('click', () => this.handleRejectFriend(r.sender_name));
	    });
	}
	private updateSentFriendRequests(
	    requests: Array<{ username: string; avatar?: string }>
	): void {
	    const list = this.section.querySelector('#sent-friend-requests')!;
	    list.innerHTML = '';

	    if (requests.length === 0) {
	        const li = document.createElement('li');
	        li.innerHTML = `
	            <div class="text-gray-600 px-4 py-4 text-center">
	                Aucune demande envoyée
	            </div>
	        `;
	        list.appendChild(li);
	        return;
	    }

	    requests.forEach((r) => {
	        const li = document.createElement('li');

	        const avatarUrl = r.avatar
	            ? `${import.meta.env.VITE_API_URL}/uploads/${r.avatar}`
	            : `${import.meta.env.VITE_API_URL}/uploads/avatar.png`;

	        li.innerHTML = `
	            <div class="flex items-center justify-between py-2">
	                <div class="flex items-center gap-3">
	                    <img src="${avatarUrl}" class="w-10 h-10 rounded-full object-cover">
	                    <span class="text-gray-800">${r.username}</span>
	                </div>
	                <div class="flex gap-2">
	                    <span class="text-sm text-gray-500 italic">En attente</span>
	                </div>
	            </div>
	        `;

	        list.appendChild(li);
	    });
	}
    private async handleAddFriend(friendUsername: string): Promise<void> {
	    try {
	        const response = await fetch(
	            `${import.meta.env.VITE_API_URL}/friends/request`,
	            {
	                method: 'POST',
	                headers: { 'Content-Type': 'application/json' },
	                credentials: 'include',
	                body: JSON.stringify({ username: friendUsername }),
	            }
	        );

	        if (response.ok) {
	            this.loadDashboardData();
	        } else {
	            const err = await response.json();
	            alert(err.error || 'Erreur');
	        }
	    } catch (err) {
	        console.error(err);
	    }
	}
	private handleNewConversation = async (): Promise<void> => {
	    const username = prompt("Entrez le nom de l'utilisateur pour démarrer une conversation :");
	    if (!username || username.trim() === '') return;

	    try {
	        const res = await fetch(`${import.meta.env.VITE_API_URL}/messages/start`, {
	            method: 'POST',
	            headers: { 'Content-Type': 'application/json' },
	            credentials: 'include',
	            body: JSON.stringify({ username: username.trim() })
	        });

	        if (!res.ok) {
	            const err = await res.json();
	            alert(err.error || 'Impossible de créer la conversation');
	            return;
	        }

	        // Recharge la liste et ouvre la nouvelle conversation
	        await this.loadConversations();
	        await this.loadConversation(username.trim());
	    } catch (err) {
	        console.error(err);
	    }
	};
	private handleSendMessage = async (): Promise<void> => {
	    if (!this.currentConversation) return;

	    const messageInput = this.section.querySelector('#message-input') as HTMLInputElement;
	    const content = messageInput.value.trim();

	    if (!content) return;

        // Use WebSocket if connected
        chatService.send(this.currentConversation, content);
        messageInput.value = '';
	};

    // WS event handlers
    private _handleWsMessage = (data: any): void => {
        if (!this.currentConversation) return;
        // Show message if it belongs to the current conversation
        const isFromPartner = data.from === this.currentConversation;
        const isToPartner = data.to === this.currentConversation;
        const isMine = this.currentUsername !== null
            ? data.from === this.currentUsername
            : isToPartner && !isFromPartner;

        if (isFromPartner || isToPartner) {
            const container = this.section.querySelector<HTMLDivElement>('#messages-container');
            if (!container) return;
            const div = document.createElement('div');
            div.textContent = `${data.from}: ${data.content}`;
            div.className = isMine
                ? 'text-right font-medium text-blue-700'
                : 'text-left text-gray-800';
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }
        // Refresh conversation list
        this.loadConversations();
    };
	private async handleAcceptFriend(username: string): Promise<void> {
	    try {
	        const response = await fetch(
	            `${import.meta.env.VITE_API_URL}/friends/accept`,
	            {
	                method: 'POST',
	                headers: { 'Content-Type': 'application/json' },
	                credentials: 'include',
	                body: JSON.stringify({ username }),
	            }
	        );

	        if (response.ok) {
	            this.loadDashboardData();
	        }
	    } catch (err) {
	        console.error(err);
	    }
	}
	private async handleRejectFriend(username: string): Promise<void> {
	    try {
	        const response = await fetch(
	            `${import.meta.env.VITE_API_URL}/friends/reject`,
	            {
	                method: 'POST',
	                headers: { 'Content-Type': 'application/json' },
	                credentials: 'include',
	                body: JSON.stringify({ username }),
	            }
	        );

	        if (response.ok) {
	            this.loadDashboardData();
	        }
	    } catch (err) {
	        console.error(err);
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
