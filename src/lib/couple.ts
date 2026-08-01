import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from './db'
import { useAuth } from './auth'
import { PREVIEW } from './preview'

/**
 * Which couple you belong to.
 *
 * A `members/{uid}` document holds one field, `coupleId`. Everything the app
 * stores carries that id, and the rules compare it against yours — so two
 * couples can share one deployment without ever seeing each other's dates.
 *
 * Membership lives in the database rather than in the rules on purpose. The
 * old guest list meant adding a person was a rules edit and a re-publish;
 * now it's one small document, and the rules never change again.
 */

export const PREVIEW_COUPLE = 'preview-couple'

export type Membership =
  | { state: 'loading' }
  /** Signed in, but nobody has said which couple you're in. */
  | { state: 'unassigned' }
  | { state: 'ready'; coupleId: string }

export function useCouple(): Membership {
  const { user } = useAuth()
  const [membership, setMembership] = useState<Membership>(
    PREVIEW ? { state: 'ready', coupleId: PREVIEW_COUPLE } : { state: 'loading' },
  )

  useEffect(() => {
    if (PREVIEW) return
    if (!db || !user) {
      setMembership({ state: 'loading' })
      return
    }

    return onSnapshot(
      doc(db, 'members', user.uid),
      (snap) => {
        const coupleId = snap.data()?.coupleId
        setMembership(
          typeof coupleId === 'string' && coupleId
            ? { state: 'ready', coupleId }
            : { state: 'unassigned' },
        )
      },
      // A rules failure here means the same thing as a missing document: this
      // account hasn't been placed in a couple yet.
      () => setMembership({ state: 'unassigned' }),
    )
  }, [user])

  return membership
}
