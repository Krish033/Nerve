/**
 * Environment variable validation.
 *
 * Call validateEnv() once at app startup to catch missing config early.
 * Add all required client-side env vars here.
 *
 * Note: Only NEXT_PUBLIC_* vars are available in the browser bundle.
 * Server-only vars should be validated in a separate server-side module.
 */

type EnvVar = {
  key: string;
  description: string;
  required: boolean;
};

const clientEnvVars: EnvVar[] = [
  { key: "NEXT_PUBLIC_FIREBASE_API_KEY", description: "Firebase API key", required: true },
  { key: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", description: "Firebase auth domain", required: true },
  { key: "NEXT_PUBLIC_FIREBASE_PROJECT_ID", description: "Firebase project ID", required: true },
  { key: "NEXT_PUBLIC_FIREBASE_APP_ID", description: "Firebase app ID", required: true },
  { key: "NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY", description: "Cloudflare Turnstile site key", required: false },
];

export function validateEnv(): void {
  if (typeof window === "undefined") return; // Server-side: skip

  const missing: string[] = [];

  for (const envVar of clientEnvVars) {
    const value = process.env[envVar.key];
    if (envVar.required && (!value || value.trim() === "")) {
      missing.push(`  - ${envVar.key}: ${envVar.description}`);
    }
  }

  if (missing.length > 0 && process.env.NODE_ENV !== "production") {
    console.warn(
      `[env] Missing required environment variables:\n${missing.join("\n")}\n` +
      `Copy .env.example to .env.local and fill in the values.`
    );
  }
}

/** Type-safe getter with fallback */
export function getEnv(key: string, fallback?: string): string {
  const value = process.env[key];
  if (!value) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
