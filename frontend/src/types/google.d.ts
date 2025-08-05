// src/types/google.d.ts
export {};

declare global {
  namespace google {
    namespace accounts.id {
      interface CredentialResponse {
        credential: string;
        select_by: string;
        clientId: string;
      }

      function initialize(config: {
        client_id: string;
        callback: (response: CredentialResponse) => void;
      }): void;

      function renderButton(
        parent: HTMLElement,
        options: {
          theme?: 'outline' | 'filled_blue' | 'filled_black';
          size?: 'small' | 'medium' | 'large';
          text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
          shape?: 'rectangular' | 'pill' | 'circle' | 'square';
          logo_alignment?: 'left' | 'center';
          width?: string;
        }
      ): void;

      function prompt(): void;
    }
  }

  interface Window {
    google: typeof google;
  }
}
