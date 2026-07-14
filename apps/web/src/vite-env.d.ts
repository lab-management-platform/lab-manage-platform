/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_AUTH_MODE?: "local" | "oidc";
  readonly VITE_KEYCLOAK_ISSUER?: string;
  readonly VITE_KEYCLOAK_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.css" {
  const content: string;
  export default content;
}
