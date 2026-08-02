import { Suspense, lazy, useState } from 'react'
import Boundary from './components/Boundary'
import Device from './components/Device'
import InstallPrompt from './components/InstallPrompt'
import PixelHeart from './components/PixelHeart'
import UpdatePill from './components/UpdatePill'
import Login from './screens/Login'
import { AuthProvider, useAuth } from './lib/auth'
import { isConfigured } from './lib/firebase'
import { PREVIEW } from './lib/preview'

/**
 * The signed-in app — calendar, map, Firestore, the Maps SDK wrapper — is a
 * separate chunk. A stranger who opens the URL downloads the login screen and
 * nothing else, which is both a privacy property and a much faster first paint
 * on a phone.
 */
const Home = lazy(() => import('./screens/Home'))

/**
 * Lazy for the same reason as Home: it pulls in the Firestore SDK, and a
 * signed-out visitor must not download that. Importing it eagerly here silently
 * undid the entry-chunk split and more than doubled first load.
 */
const ReportSheet = lazy(() => import('./components/ReportSheet'))

export default function App() {
  return (
    <AuthProvider>
      <Gate />
      {/* Outside the gate on purpose: an update or an install nudge should be
          offerable even on the login screen, and neither carries any data
          dependencies. Stacked in one fixed container so they never overlap
          if both happen to be relevant at once. */}
      <div className="safe-bottom pointer-events-none fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-sm flex-col items-stretch gap-2">
        <UpdatePill />
        <InstallPrompt />
      </div>
    </AuthProvider>
  )
}

/**
 * The front door. Nothing below this renders — and no Firestore listener is
 * ever attached — until Firebase confirms a signed-in user, which is what
 * makes the public deploy safe to hand out.
 */
function Gate() {
  const { user, loading } = useAuth()
  // Counter, not a boolean — a <dialog> can close itself without telling React.
  const [reportReq, setReportReq] = useState(0)
  const reportButton = (
    <button
      type="button"
      onClick={() => setReportReq((n) => n + 1)}
      className="pixel-btn legend px-2 py-1"
      title="Report a bug or suggest something"
    >
      bug?
    </button>
  )

  // Dev-only UI preview. `PREVIEW` is hard-wired to false in any production
  // build, so this branch cannot exist on the deployed site.
  if (PREVIEW) {
    return (
      <Device status={reportButton}>
        <Boundary>
          <Suspense fallback={<Booting />}>
            <Home />
          </Suspense>
        </Boundary>
        {reportReq > 0 && (
          <Boundary>
            <Suspense fallback={null}>
              <ReportSheet openRequest={reportReq} onClose={() => setReportReq(0)} />
            </Suspense>
          </Boundary>
        )}
      </Device>
    )
  }

  if (!isConfigured) {
    return (
      <Device>
        <Setup />
      </Device>
    )
  }

  if (loading) {
    return (
      <Device>
        <Booting />
      </Device>
    )
  }

  if (!user) {
    return (
      <Device>
        <Login />
      </Device>
    )
  }

  return (
    <Device status={reportButton}>
      <Suspense fallback={<Booting />}>
        <Home />
      </Suspense>
      <ReportSheet openRequest={reportReq} onClose={() => setReportReq(0)} />
    </Device>
  )
}

/**
 * Restoring a stored session takes a beat. Showing the heart rather than a
 * spinner keeps the device feeling like it's powering on.
 */
function Booting() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
      <PixelHeart size={40} color="var(--color-lav)" className="beat" />
      <p className="legend text-[var(--color-ink)]/60">waking up</p>
    </div>
  )
}

/**
 * Only ever seen locally, before `.env.local` exists. Worth building properly
 * anyway — a blank screen with a console error is a bad first five minutes.
 */
function Setup() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <PixelHeart size={48} color="var(--color-lav)" outline />
      <p className="font-[family-name:var(--font-display)] text-xl font-bold">
        no keys yet
      </p>
      <p className="prose max-w-sm text-sm text-[var(--color-ink)]/70">
        Copy <code className="pixel-box-sm px-1.5 py-0.5">.env.example</code> to{' '}
        <code className="pixel-box-sm px-1.5 py-0.5">.env.local</code>, fill in
        your Firebase values, then restart the dev server. The README has the
        click-by-click.
      </p>
      <p className="prose max-w-sm text-sm text-[var(--color-ink)]/60">
        To work on the look without any of that:{' '}
        <code className="pixel-box-sm px-1.5 py-0.5">npm run ui</code>
      </p>
    </div>
  )
}
