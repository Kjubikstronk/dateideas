import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './db'
import { useAuth } from './auth'
import { useCouple } from './couple'
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
  const membership = useCouple()
  const coupleId = membership.state === 'ready' ? membership.coupleId : null
  const [all, setItems] = useState<DateIdea[]>(PREVIEW ? SAMPLE_DATES : [])

  /**
   * Deleting is the only thing here you can't take back, so it doesn't happen
   * straight away. The date disappears from view immediately, and the actual
   * write is held for a few seconds behind an undo.
   *
   * Deliberately held in memory, not written as a "deleted" flag: if the tab
   * closes mid-countdown the delete simply never happens. Losing a deletion is
   * recoverable — you press delete again — while losing the date is not.
   */
  const [pendingId, setPendingId] = useState<string | null>(null)
  const pendingTimer = useRef<number | null>(null)

  const items = useMemo(
    () => (pendingId ? all.filter((it) => it.id !== pendingId) : all),
    [all, pendingId],
  )
  const pendingDelete = useMemo(
    () => (pendingId ? (all.find((it) => it.id === pendingId) ?? null) : null),
    [all, pendingId],
  )
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
    if (!db || !user || !coupleId) {
      setItems([])
      return
    }

    setLoading(true)
    const unsub = onSnapshot(
      query(collection(db, COLLECTION), where('coupleId', '==', coupleId)),
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
  }, [user, coupleId])



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
      if (!store || !user || !coupleId) return
      // Both stamps are enforced by the rules: coupleId must match yours, and
      // createdBy must be you, so neither can be forged.
      await guard(() =>
        addDoc(collection(store, COLLECTION), {
          ...draft,
          coupleId,
          createdBy: user.uid,
          createdAt: Date.now(),
        }),
      )
    },
    [user, coupleId, guard],
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

  /** How long you get to change your mind. */
  const UNDO_MS = 6000

  /** The write itself, once the undo window has closed. */
  const commitDelete = useCallback(
    async (id: string) => {
      if (PREVIEW) {
        setItems((prev) => prev.filter((it) => it.id !== id))
        return
      }
      const store = db
      if (!store) return
      await guard(() => deleteDoc(doc(store, COLLECTION, id)))
    },
    [guard],
  )

  const clearTimer = () => {
    if (pendingTimer.current !== null) {
      window.clearTimeout(pendingTimer.current)
      pendingTimer.current = null
    }
  }

  const remove = useCallback(
    (id: string) => {
      // A second delete while one is still pending commits the first rather
      // than dropping it — otherwise the earlier date would silently come back.
      setPendingId((current) => {
        if (current && current !== id) void commitDelete(current)
        return id
      })
      clearTimer()
      pendingTimer.current = window.setTimeout(() => {
        pendingTimer.current = null
        setPendingId(null)
        void commitDelete(id)
      }, UNDO_MS)
    },
    [commitDelete],
  )

  const undoRemove = useCallback(() => {
    clearTimer()
    setPendingId(null)
  }, [])

  // Unmounting leaves the date intact, matching the tab-close behaviour above.
  useEffect(() => clearTimer, [])

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
    membership,
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
    pendingDelete,
    undoRemove,
  }
}
