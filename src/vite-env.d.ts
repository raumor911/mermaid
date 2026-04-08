/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPEKTR_WORKSPACE?: string;
  readonly VITE_SPEKTR_BUILD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
