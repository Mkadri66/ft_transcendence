export class PrivacyView {
    render(container: HTMLElement) {
        container.innerHTML = `
            <h1 class="text-2xl font-bold mb-4">Privacy Policy</h1>
            <div class="prose max-w-none">
                Privacy Policy for Transcendence<br><br>
                We collect your name, email, and password only to create and manage your account. We may also collect IP addresses and usage data for security and analytics purposes.<br>
                Your data is never shared with third parties. It is stored securely and protected according to standard security practices.<br>
                You have the right to access, modify, or delete your data at any time via your profile.<br>
                For any questions about your privacy or data, please contact us at the section Contact.
            </div>
        `;
    }
}
