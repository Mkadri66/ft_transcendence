export class TermsView {
    render(container: HTMLElement) {
        container.innerHTML = `
            <h1 class="text-2xl font-bold mb-4">Terms of Service</h1>
            <p>By using this application, you agree to the following rules:</p>
            <ul class="list-disc ml-6">
                <li>Only use the application for its intended purpose (playing multiplayer Pong).</li>
                <li>Do not attempt to hack, exploit, or damage the application.</li>
                <li>Respect other users and their privacy.</li>
            </ul>
            <p>The application is provided "as is" without warranty. The developers are not responsible for any data loss or misuse.</p>
        `;
    }
}
