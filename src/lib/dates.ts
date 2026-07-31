import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore'
import { db } from './db'
import { useAuth } from './auth'
import { PREVIEW, SAMPLE_DATES } from './preview'
import type { DateDraft, DateIdea } from '../types'

const COLLECTION = 'dates'

/**
 * The single source of truth for everything on screen.
 *
 * Firestore's `onSnapshot` is a live subscription, so a change either of you
 * makes shows up on the other's screen without a refresh — that's the whole
 * reason for a database rather than a file in the repo.
 *
 * The subscription is only ever opened for a signed-in user, so an unauthorised
 * visitor never even attempts a read.
 */
export function useDates() {
  const { user } = useAuth()
  const [items, setItems] = useState<DateIdea[]>(PREVIEW ? SAMPLE_DATES : [])
  const [loading, setLoading] = useState(!PREVIEW)
  const [error, setError] = useState<string | null>(null)
  const [writeError, setWriteError] = useState<string | null>(null)

  /**
   * Firestore applies a write locally first and rolls it back if the server
   * rejects it. Without this, a refused save looked like the date appearing
   * and then vanishing on its own.
   */
  const guard = useCallback(async (run: () => Promise<unknown>) => {
    try {
      await run()
      setWriteError(null)
    } catch (err) {
      const code = (err as { code?: string })?.code
      setWriteError(
        code === 'permission-denied'
          ? "That didn't save — this account isn't allowed to write here."
          : "That didn't save. Check your connection and try again.",
      )
    }
  }, [])

  useEffect(() => {
    if (PREVIEW) return
    if (!db || !user) {
      setItems([])
      return
    }

    setLoading(true)
    const unsub = onSnapshot(
      collection(db, COLLECTION),
      (snap) => {
        setItems(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DateIdea, 'id'>) })),
        )
        setLoading(false)
        setError(null)
      },
      (err) => {
        // Almost always means the Firestore rules don't list this UID.
        setError(
          err.code === 'permission-denied'
            ? "This account isn't on the list for this database."
            : "Couldn't reach your dates. Check your connection.",
        )
        setLoading(false)
      },
    )
    return unsub
  }, [user])

  const add = useCallback(
    async (draft: DateDraft) => {
      if (PREVIEW) {
        setItems((prev) => [
          ...prev,
          { ...draft, id: crypto.randomUUID(), createdBy: 'preview', createdAt: Date.now() },
        ])
        return
      }
      // Captured to a local so the null check still holds inside the deferred
      // closure below — TypeScript drops the narrowing across a callback.
      const store = db
      if (!store || !user) return
      // The rules require this stamp to match the caller, so it can't be forged.
      await guard(() =>
        addDoc(collection(store, COLLECTION), {
          ...draft,
          createdBy: user.uid,
          createdAt: Date.now(),
        }),
      )
    },
    [user, guard],
  )

  const update = useCallback(async (id: string, patch: Partial<DateDraft>) => {
    if (PREVIEW) {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
      return
    }
    const store = db
    if (!store) return
    // `createdBy` and `createdAt` are deliberately not patchable — the rules
    // reject an update that changes authorship anyway.
    await guard(() => updateDoc(doc(store, COLLECTION, id), patch))
  }, [guard])

  const remove = useCallback(async (id: string) => {
    if (PREVIEW) {
      setItems((prev) => prev.filter((it) => it.id !== id))
      return
    }
    const store = db
    if (!store) return
    await guard(() => deleteDoc(doc(store, COLLECTION, id)))
  }, [guard])

  /** Scheduled dates bucketed by `yyyy-MM-dd`, which is what the grid needs. */
  const byDay = useMemo(() => {
    const map = new Map<string, DateIdea[]>()
    for (const item of items) {
      if (!item.scheduledFor) continue
      const bucket = map.get(item.scheduledFor)
      if (bucket) bucket.push(item)
      else map.set(item.scheduledFor, [item])
    }
    // Within a day, earlier times first; untimed dates sit at the end.
    for (const bucket of map.values()) {
      bucket.sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'))
    }
    return map
  }, [items])

  /** Everything without a day yet — the wishlist. */
  const ideas = useMemo(
    () => items.filter((it) => !it.scheduledFor),
    [items],
  )

  return {
    items,
    byDay,
    ideas,
    loading,
    error,
    writeError,
    dismissWriteError: () => setWriteError(null),
    add,
    update,
    remove,
  }
}
