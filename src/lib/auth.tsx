import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { auth, isConfigured } from './firebase'

type AuthState = {
  user: User | null
  /** True until Firebase has restored (or ruled out) a stored session. */
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  leave: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(isConfigured)

  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, (next) => {
      setUser(next)
      setLoading(false)
    })
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      signIn: async (email, password) => {
        if (!auth) throw new Error('not-configured')
        await signInWithEmailAndPassword(auth, email.trim(), password)
      },
      resetPassword: async (email) => {
        if (!auth) throw new Error('not-configured')
        await sendPasswordResetEmail(auth, email.trim())
      },
      leave: async () => {
        if (!auth) return
        await signOut(auth)
        // Dynamic import on purpose: a static one would drag the Firestore SDK
        // into the entry chunk and undo the login screen's code split.
        const { clearCache } = await import('./db')
        await clearCache()
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

/**
 * Firebase error codes are for developers. These are for the two people who
 * use this. Errors say what happened and what to do — they don't apologise and
 * they don't leak SDK vocabulary.
 */
export function readableAuthError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: unknown }).code)
      : ''

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      // Firebase deliberately collapses these so the form can't be used to
      // discover which emails exist. The message stays vague for the same reason.
      return "That email and password don't match."
    case 'auth/invalid-email':
      return "That doesn't look like an email address."
    case 'auth/too-many-requests':
      return 'Too many tries. Wait a minute, then go again.'
    case 'auth/network-request-failed':
      return 'No connection. Check your signal and try again.'
    case 'auth/user-disabled':
      return 'This account is turned off.'
    default:
      return 'Something went wrong signing in. Try again.'
  }
}
