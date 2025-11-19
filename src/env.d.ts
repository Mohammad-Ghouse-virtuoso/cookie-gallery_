// env.d.ts (place at project root)
interface ImportMetaEnv {
  VITE_API_URL?: string;
  VITE_SENTRY_DSN?: string;
  VITE_SENTRY_DSN_FRONTEND?: string;
  VITE_SENTRY_RELEASE?: string;
  VITE_APP_VERSION?: string;
  VITE_ENVIRONMENT?: string;
  VITE_SENTRY_SAMPLE_RATE?: string;
  MODE?: string;
  // add any other known keys you rely on

  // allow arbitrary access by key (this fixes "string can't be used to index type {}")
  [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
