import "server-only";

/**
 * The Firebase *web* config the browser needs for the Google popup. It is public by design
 * (it identifies the project; it grants nothing). App Hosting provides FIREBASE_WEBAPP_CONFIG;
 * in development .env.development points it at the demo-lost-cause emulator project.
 */
export type WebConfig = { apiKey: string; authDomain: string; projectId: string };

export function webConfig(): WebConfig {
  const raw = process.env.FIREBASE_WEBAPP_CONFIG;
  if (!raw) throw new Error("FIREBASE_WEBAPP_CONFIG is not set");
  const c = JSON.parse(raw);
  return { apiKey: c.apiKey, authDomain: c.authDomain, projectId: c.projectId };
}

/** Only in development: the Auth emulator's address, so the popup never reaches Google. */
export const authEmulatorUrl = () =>
  process.env.NODE_ENV !== "production" && process.env.FIREBASE_AUTH_EMULATOR_HOST
    ? `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`
    : null;
