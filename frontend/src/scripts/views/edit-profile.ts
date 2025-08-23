export class EditProfileView {
    private section: HTMLElement;
    private form: HTMLFormElement | null;
    private errorBox: HTMLElement | null;
    private currentUsername: string;
    private currentAvatarUrl: string;
    private avatarImg: HTMLImageElement | null;
    private successBox: HTMLElement | null =
        document.getElementById('success-box');

    constructor(currentUsername: string, currentAvatarUrl: string) {
        this.section = document.createElement('section');
        this.section.className = 'edit-profile';
        this.currentUsername = '';
        this.currentAvatarUrl = '';
        this.section.innerHTML = this.getHtml();
        this.form = null;
        this.errorBox = null;
        this.successBox = this.section.querySelector('#success-box'); 
        this.avatarImg = null;
    }

    public getHtml(): string {
        return `
        <form id="edit-profile-form" enctype="multipart/form-data" class="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8 space-y-6">
          <div class="space-y-2">
            <h2 class="text-3xl font-bold text-gray-800 text-center">Modifier le profil</h2>
            <p class="text-gray-600 text-center">Mettez à jour vos informations</p>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1" for="username">Pseudo</label>
              <input 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                id="username"
                name="username"
                type="text"
                placeholder="Votre nouveau pseudo"
                value="${this.currentUsername}"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Avatar actuel</label>
              <div class="flex items-center space-x-4">
                <img src="${this.currentAvatarUrl}" alt="Avatar actuel" class="w-16 h-16 rounded-full object-cover">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1" for="avatar">Changer d'avatar</label>
                  <input 
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    id="avatar"
                    name="avatar"
                    type="file"
                    accept="image/png, image/jpeg"
                  >
                </div>
              </div>
            </div>

            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mt-5 rounded relative hidden" role="alert">
              <span class="block xl:inline"></span>
              <span class="absolute top-0 bottom-0 right-0 px-4 py-3">
                <svg class="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
              </span>
            </div>

            <div id="success-box" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 mt-5 rounded relative hidden" role="alert">
            <span class="block xl:inline"></span>
            <span class="absolute top-0 bottom-0 right-0 px-4 py-3">
                <svg class="fill-current h-6 w-6 text-green-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <title>Close</title>
                <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
                </svg>
            </span>
            </div>

            <div>
              <button 
                type="submit" 
                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 transform hover:scale-[1.02] shadow-md"
              >
                Enregistrer les modifications
              </button>
            </div>
            <div class="mt-3">
            <a 
                href="/reset-password" 
                class="block w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg text-center transition duration-200 transform hover:scale-[1.02] shadow-md"
            >
                Changer mon mot de passe
            </a>
            </div>
          </div>
        </form>
        `;
    }

    public async render(container: HTMLElement): Promise<void> {
        container.appendChild(this.section);
        this.errorBox = this.section.querySelector('.bg-red-100');
        this.avatarImg = this.section.querySelector('img');
        this.hideError();

        try {
            // Récupérer les données utilisateur
            await this.fetchUserData();
            this.setupEventListeners();
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            this.showError('Impossible de charger les données du profil');
        }
    }

    private async fetchUserData(): Promise<void> {
        const jwtToken = localStorage.getItem('jwtToken');
        if (!jwtToken) {
            window.history.pushState({}, '', '/login');
            window.dispatchEvent(new PopStateEvent('popstate'));
            return;
        }

        const jwtResponse = await fetch(
            `${import.meta.env.VITE_API_URL}/auth/api/validate-token`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${jwtToken}`,
                },
            }
        );

        if (!jwtResponse.ok) {
            window.history.pushState({}, '', '/login');
            window.dispatchEvent(new PopStateEvent('popstate'));
            return;
        }
        const response = await fetch(
            `${import.meta.env.VITE_API_URL}/user-profile`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${jwtToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.message ||
                    'Erreur lors de la récupération des données'
            );
        }

        const userData = await response.json();

        // Mettre à jour les données locales
        this.currentUsername = userData.username;
        this.currentAvatarUrl = `${import.meta.env.VITE_API_URL}${
            userData.avatar || '/uploads/avatar.png'
        }`;

        console.log(this.currentAvatarUrl);
        // Mettre à jour les champs du formulaire
        const usernameInput = this.section.querySelector(
            '#username'
        ) as HTMLInputElement;
        if (usernameInput) {
            usernameInput.value = this.currentUsername;
        }

        // Mettre à jour l'image de l'avatar
        if (this.avatarImg) {
            this.avatarImg.src = this.currentAvatarUrl;
        }
    }

    public destroy(): void {
        if (this.form) {
            this.form.removeEventListener('submit', this.handleSubmit);
        }
        this.section.remove();
    }

    private setupEventListeners(): void {
        this.form = this.section.querySelector('form');
        this.form?.addEventListener('submit', this.handleSubmit.bind(this));

        const avatarInput = this.section.querySelector('#avatar');
        avatarInput?.addEventListener('change', (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file && this.avatarImg) {
                this.avatarImg.src = URL.createObjectURL(file);
            }
        });
    }

    private showError(message: string): void {
        if (!this.errorBox) return;

        const messageSpan = this.errorBox.querySelector('span.block');
        const closeButton = this.errorBox.querySelector('svg');

        if (messageSpan) {
            messageSpan.innerHTML = message;
            this.errorBox.classList.remove('hidden');
        }

        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.hideError();
            });
        }
    }

    private hideError(): void {
        if (this.errorBox) {
            this.errorBox.classList.add('hidden');
        }
    }

    private showSuccess(message: string): void {
        if (!this.successBox) return;

        const messageSpan = this.successBox.querySelector('span.block');
        const closeButton = this.successBox.querySelector('svg');

        if (messageSpan) {
            messageSpan.innerHTML = message;
            this.successBox.classList.remove('hidden');
        }

        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.hideSuccess();
            });
        }
    }

    private hideSuccess(): void {
        if (this.successBox) {
            this.successBox.classList.add('hidden');
        }
    }

    private validateForm(formData: FormData): boolean {
        const username = formData.get('username') as string;
        const usernameRegex = /^[a-zA-Z0-9]{3,20}$/;

        if (username && !usernameRegex.test(username)) {
            this.showError(`
                Le pseudo doit :<br>
                - Contenir entre 3 et 20 caractères<br>
                - Utiliser seulement des lettres et chiffres<br>
                - Ne pas contenir d'espaces ou caractères spéciaux
            `);
            return false;
        }

        return true;
    }

    private async handleSubmit(e: Event): Promise<void> {
        e.preventDefault();
        if (!this.form) return;

        const formData = new FormData(this.form);

        // Ne pas envoyer le champ username s'il n'a pas été modifié
        if (formData.get('username') === this.currentUsername) {
            formData.delete('username');
        }

        // Ne pas envoyer le champ avatar s'il n'y a pas de fichier sélectionné
        const avatarFile = formData.get('avatar') as File;
        if (avatarFile.size === 0) {
            formData.delete('avatar');
        }

        if (this.validateForm(formData)) {
            this.hideError();
            try {
                const response = await fetch(
                    `${import.meta.env.VITE_API_URL}/edit-profile`,
                    {
                        method: 'PATCH',
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem(
                                'jwtToken'
                            )}`,
                        },
                        body: formData,
                    }
                );

                if (!response.ok) {
                    const errorData = await response.json();
                    this.showError(
                        errorData.error ||
                            errorData.message ||
                            `Erreur HTTP: ${response.status}`
                    );
                    return;
                }

                const data = await response.json();

                this.showSuccess(data.message);
            } catch (error) {
                console.error('Erreur:', error);
                this.showError(
                    'Échec de la mise à jour du profil. Veuillez réessayer.'
                );
            }
        }
    }

    private showLoading(): void {
        const submitButton = this.section.querySelector(
            'button[type="submit"]'
        );
        if (submitButton) {
            submitButton.innerHTML =
                '<span class="loading">Chargement...</span>';
            submitButton.setAttribute('disabled', 'true');
        }
    }

    private hideLoading(): void {
        const submitButton = this.section.querySelector(
            'button[type="submit"]'
        );
        if (submitButton) {
            submitButton.textContent = 'Enregistrer les modifications';
            submitButton.removeAttribute('disabled');
        }
    }
}
