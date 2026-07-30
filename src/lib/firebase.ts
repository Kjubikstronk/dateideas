import { initializeApp } from 'firebase/app'
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from 'firebase/auth'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/**
 * Whether the build actually carries Firebase credentials. Checked before we
 * touch the SDK so a missing `.env.local` produces a readable setup screen
 * rather than a stack trace from deep inside Firebase.
 */
export const isConfigured = Boolean(config.apiKey && config.projectId)

/** Exported so the data layer can attach Firestore lazily, in its own chunk. */
export const app = isConfigured ? initializeApp(config) : null

export const auth = app ? getAuth(app) : null

// Keep the session across restarts. This is a thing you check on your phone
// in a queue somewhere; being asked to sign in every time would kill it.
if (auth) {
  void setPersistence(auth, browserLocalPersistence)
}
