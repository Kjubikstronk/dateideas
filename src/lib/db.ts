import {
  clearIndexedDbPersistence,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  terminate,
} from 'firebase/firestore'
import { app } from './firebase'

/**
 * The one Firestore instance, created with an on-device cache.
 *
 * `initializeFirestore` rather than `getFirestore` because the cache has to be
 * configured before anything touches the database — so every consumer imports
 * from here instead of calling getFirestore itself.
 *
 * With persistence on, the app opens instantly from cache and keeps working
 * with no signal: edits queue locally and sync when you resurface. For
 * something you check on the U-Bahn that's the difference between usable and
 * not. The multi-tab manager keeps two open tabs from fighting over the cache.
 *
 * This module must never be reachable from the entry chunk — importing it from
 * App would pull the Firestore SDK back into the login screen's download.
 */
export const db = app
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })
  : null

/**
 * Wipe the on-device copy.
 *
 * The cache survives signing out, which matters because "leave" exists for the
 * case where you've handed someone your phone. Firestore refuses to clear a
 * live instance, hence the terminate first.
 */
export async function clearCache() {
  if (!db) return
  try {
    await terminate(db)
    await clearIndexedDbPersistence(db)
  } catch {
    // Another tab still holds the cache, or the browser refused. Signing out
    // is the important part and has already happened.
  }
}
