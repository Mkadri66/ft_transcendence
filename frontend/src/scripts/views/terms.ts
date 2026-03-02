export class TermsView {
    render(container: HTMLElement) {
        container.innerHTML = `
            <h1 class="text-2xl font-bold mb-4">Terms of Service</h1>
            <div class="prose max-w-none">
                Welcome to Transcendence!<br><br>
                By using this application, you agree to the following rules:<br>
                1. Only use the application for its intended purpose (playing multiplayer Pong).<br>
                2. Do not attempt to hack, exploit, or damage the application.<br>
                3. Respect other users and their privacy.<br>
                4. You must be at least 13 years old to use this service.<br><br>
                The application is provided "as is" without any warranty. The developers are not responsible for any data loss, misuse, or interruptions.<br>
                We reserve the right to suspend or delete accounts if these rules are violated.<br>
                All content, logos, and materials in this app remain the property of the developers.
            </div>
        `;
    }
}
