import { useCallback, useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore'
import { app } from './firebase'
import { useAuth } from './auth'
import { PREVIEW } from './preview'

const COLLECTION = 'reports'
const db = app ? getFirestore(app) : null

export type Report = {
  id: string
  kind: 'bug' | 'idea'
  text: string
  /** Captured automatically — the details nobody thinks to include. */
  context: {
    screen: string
    view: string
    agent: string
    when: string
  }
  done: boolean
  createdBy: string
  createdAt: number
}

/**
 * Whatever the app can work out about the situation, so a report is
 * actionable without a back-and-forth. "The map is broken" is much more
 * useful as "the map is broken, iPhone, 390x844, map tab".
 */
export function captureContext(): Report['context'] {
  // The visible tab is rendered state rather than something this module owns,
  // and reading it here beats threading a "current view" prop through the app
  // for one string that only ever gets written to a report.
  const tab =
    document.querySelector('nav [aria-current="page"]')?.textContent?.trim() ??
    'desktop (all panes)'

  return {
    screen: `${window.innerWidth}x${window.innerHeight}`,
    view: tab,
    agent: navigator.userAgent,
    when: new Date().toISOString(),
  }
}

export function useReports() {
  const { user } = useAuth()
  const [items, setItems] = useState<Report[]>([])

  useEffect(() => {
    if (PREVIEW) return
    if (!db || !user) {
      setItems([])
      return
    }
    return onSnapshot(
      collection(db, COLLECTION),
      (snap) =>
        setItems(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<Report, 'id'>) }))
            .sort((a, b) => b.createdAt - a.createdAt),
        ),
      // A broken reports list must never break the app it reports on.
      () => setItems([]),
    )
  }, [user])

  const send = useCallback(
    async (kind: Report['kind'], text: string) => {
      const draft = {
        kind,
        text: text.trim(),
        context: captureContext(),
        done: false,
        createdBy: user?.uid ?? 'preview',
        createdAt: Date.now(),
      }
      if (PREVIEW || !db || !user) {
        setItems((prev) => [{ ...draft, id: crypto.randomUUID() }, ...prev])
        return
      }
      await addDoc(collection(db, COLLECTION), draft)
    },
    [user],
  )

  const setDone = useCallback(async (id: string, done: boolean) => {
    if (PREVIEW || !db) {
      setItems((prev) => prev.map((r) => (r.id === id ? { ...r, done } : r)))
      return
    }
    await updateDoc(doc(db, COLLECTION, id), { done })
  }, [])

  const remove = useCallback(async (id: string) => {
    if (PREVIEW || !db) {
      setItems((prev) => prev.filter((r) => r.id !== id))
      return
    }
    await deleteDoc(doc(db, COLLECTION, id))
  }, [])

  return { items, send, setDone, remove }
}
