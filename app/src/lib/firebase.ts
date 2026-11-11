import "server-only";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

/**
 * One Admin SDK app for the server. All data access goes through here: the Firestore and
 * Storage security rules deny every browser, so the only way in is this code.
 *
 * Configuration comes from FIREBASE_CONFIG (App Hosting sets it; .env.development sets it to the
 * demo-lost-cause emulator project). With FIRESTORE_EMULATOR_HOST etc. set, the SDK talks to
 * the local emulators and never to the cloud.
 */
const app = getApps()[0] ?? initializeApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
/** Resolved on first use, so a build without FIREBASE_CONFIG still succeeds. */
export const bucket = () => getStorage(app).bucket();

/** Firestore Timestamp (or nothing) -> ISO string, so pages don't need to know about Firestore. */
export const iso = (t: unknown) => (t instanceof Timestamp ? t.toDate().toISOString() : null);

export const usingEmulators = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
