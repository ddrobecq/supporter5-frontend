/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_NATIO_PUBLIC_RESOURCE?: string;
  readonly VITE_NATIO_ADMIN_RESOURCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
