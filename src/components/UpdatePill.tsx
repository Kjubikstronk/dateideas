import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/** Re-check this often even if the app is left open for days. */
const CHECK_EVERY_MS = 60 * 60 * 1000

/**
 * Keeps the installed app current without ever reloading mid-sentence.
 *
 * Service workers serve the cached copy first, which is what makes offline
 * work — and also the classic way people get stranded on a months-old build.
 * Two things prevent that here: an update check every time the app regains
 * focus (rather than only on a cold start, which an installed PWA rarely
 * does — especially on iOS), and a visible pill when a new version is waiting.
 *
 * The reload is yours to trigger. Automatic reloads are worse than staleness
 * when they land while you're typing a note.
 */
export default function UpdatePill() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return

      const check = () => {
        // Pointless while offline, and it throws on some browsers.
        if (navigator.onLine) void registration.update()
      }

      const onVisible = () => {
        if (document.visibilityState === 'visible') check()
      }

      document.addEventListener('visibilitychange', onVisible)
      window.addEventListener('online', check)
      const timer = setInterval(check, CHECK_EVERY_MS)

      // Registration outlives the component, so this listener set is never torn
      // down — which is correct: the pill must keep working for the whole session.
      void timer
      void onVisible
    },
  })

  // Nothing to show, nothing to render.
  useEffect(() => {
    if (!needRefresh) return
    // Reduce the chance of it sitting unnoticed forever on a phone.
    document.title = '↻ update ready · our dates'
    return () => {
      document.title = 'our dates'
    }
  }, [needRefresh])

  if (!needRefresh) return null

  return (
    <div
      role="status"
      className="pointer-events-auto flex w-full max-w-sm items-center gap-3 border-[3px] border-[var(--color-ink)] bg-[var(--color-aqua)] p-3 shadow-[4px_4px_0_var(--color-ink)]"
    >
      <p className="flex-1 text-sm">A newer version is ready.</p>
      <button
        type="button"
        className="pixel-btn legend shrink-0 px-2 py-1"
        onClick={() => setNeedRefresh(false)}
      >
        later
      </button>
      <button
        type="button"
        className="pixel-btn pixel-btn-primary legend shrink-0 px-3 py-1"
        onClick={() => void updateServiceWorker(true)}
      >
        update
      </button>
    </div>
  )
}
