import { Component, type ErrorInfo, type ReactNode } from 'react'
import PixelHeart from './PixelHeart'

/**
 * Catches a render crash so it can't blank the whole page.
 *
 * The app is code-split, so the first thing that happens after you sign in is
 * a fetch for the Home chunk. When a service worker is serving a shell from an
 * older deploy, that chunk filename no longer exists, the dynamic import
 * rejects, and React unmounts everything — a white screen that a refresh
 * "fixes", because the refresh picks up the new service worker.
 *
 * A stale chunk is worth reloading for automatically: the reload IS the fix,
 * and asking someone to press a button to do what we already know is needed is
 * just ceremony. Guarded by sessionStorage so a genuinely broken build reloads
 * once and then shows the message instead of looping forever.
 */

const RELOADED = 'dateideas:chunk-reload'

/** A failed dynamic import, across browsers. */
function isStaleChunk(error: unknown): boolean {
  const text = String((error as Error)?.message ?? error ?? '')
  return (
    /Loading chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(
      text,
    )
  )
}

type Props = { children: ReactNode }
type State = { crashed: boolean; stale: boolean }

export default class Boundary extends Component<Props, State> {
  state: State = { crashed: false, stale: false }

  static getDerivedStateFromError(error: unknown): State {
    return { crashed: true, stale: isStaleChunk(error) }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (this.state.stale || isStaleChunk(error)) {
      let alreadyTried = true
      try {
        alreadyTried = sessionStorage.getItem(RELOADED) === '1'
        if (!alreadyTried) sessionStorage.setItem(RELOADED, '1')
      } catch {
        // Private mode. Fall through to the manual button rather than risking
        // a reload loop we can't remember having done.
      }
      if (!alreadyTried) {
        window.location.reload()
        return
      }
    }
    // Not swallowed silently — this is the only record of what went wrong.
    console.error('our dates crashed:', error, info.componentStack)
  }

  render() {
    if (!this.state.crashed) return this.props.children

    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <PixelHeart size={40} color="var(--color-lav)" outline />
        <p className="font-[family-name:var(--font-display)] text-lg font-bold">
          that didn&rsquo;t load
        </p>
        <p className="prose max-w-xs text-sm text-[var(--color-ink)]/70">
          {this.state.stale
            ? 'A newer version is out and this tab is on the old one.'
            : 'Something went wrong drawing this screen.'}
        </p>
        <button
          type="button"
          className="pixel-btn pixel-btn-primary px-4 py-2"
          onClick={() => {
            try {
              sessionStorage.removeItem(RELOADED)
            } catch {
              // Nothing to clear; reloading is still worth a try.
            }
            window.location.reload()
          }}
        >
          reload
        </button>
      </div>
    )
  }
}
