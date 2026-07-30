import { useState, type FormEvent } from 'react'
import { readableAuthError, useAuth } from '../lib/auth'
import PixelHeart from '../components/PixelHeart'

/**
 * Everything a stranger with the link is ever allowed to see.
 *
 * Deliberately says nothing about whose site this is, offers no sign-up, and
 * gives away nothing about which emails exist — the error copy stays vague on
 * bad credentials for exactly that reason.
 */
export default function Login() {
  const { signIn, resetPassword } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sentReset, setSentReset] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signIn(email, password)
      // No navigation needed — the auth gate swaps the screen out from under us.
    } catch (err) {
      setError(readableAuthError(err))
      setBusy(false)
    }
  }

  async function onForgot() {
    setError('')
    setSentReset(false)
    if (!email.trim()) {
      setError('Type your email above first, then tap this again.')
      return
    }
    try {
      await resetPassword(email)
      setSentReset(true)
    } catch (err) {
      setError(readableAuthError(err))
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="boot w-full max-w-xs space-y-5"
        noValidate
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <PixelHeart size={56} className="beat" />
          <p className="legend text-[var(--color-ink)]/60">two people only</p>
        </div>

        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="legend">email</span>
            <input
              type="email"
              className="pixel-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              required
            />
          </label>

          <label className="block space-y-1.5">
            <span className="legend">password</span>
            <input
              type="password"
              className="pixel-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
        </div>

        {/* Announced politely so a screen reader hears the failure without
            the message stealing focus mid-typing. */}
        <div aria-live="polite">
          {error ? (
            <p className="pixel-box-sm bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-deep)]">
              {error}
            </p>
          ) : null}
          {sentReset ? (
            <p className="pixel-box-sm bg-[var(--color-aqua)] px-3 py-2 text-sm">
              Reset link sent. Check your email.
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          className="pixel-btn pixel-btn-primary w-full px-4 py-2"
          disabled={busy}
        >
          {busy ? 'checking…' : 'let me in'}
        </button>

        <button
          type="button"
          onClick={onForgot}
          className="legend mx-auto block px-2 py-2 text-[var(--color-deep)] underline underline-offset-4"
        >
          forgot password?
        </button>
      </form>
    </div>
  )
}
