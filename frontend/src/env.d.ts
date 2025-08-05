/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    readonly VITE_CLIENT_ID_GOOGLE: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
