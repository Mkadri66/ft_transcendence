export class PrivacyView {
    render(container: HTMLElement) {
        container.innerHTML = `
            <h1 class="text-2xl font-bold mb-4">Privacy Policy</h1>
            <p>We value your privacy. In this project, we only collect the following information:</p>
            <ul class="list-disc ml-6">
                <li>Username</li>
                <li>Email address</li>
                <li>Game statistics (scores, matches)</li>
            </ul>
            <p>All personal information is stored securely and used only for the functionality of this application (e.g., authentication, game tracking).</p>
            <p>We do not share your data with third parties.</p>
        `;
    }
}
