// config.ts
// config.ts
interface AppConfig {
  SERVER_URL: string;
  APP_TITLE: string;
}

const config: AppConfig = {
  SERVER_URL: import.meta.env.VITE_API_URL,
  APP_TITLE: "Mon App"
};

export default config;