/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_REGISTRATION_OPEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
