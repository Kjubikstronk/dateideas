import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../lib/useTheme'
import PixelSprite, { BAT, GHOST, JACK } from './PixelSprite'
import BatSky from './BatSky'

/**
 * The one-time "spooky season is upon us" notice, shown the first time this
 * browser lands in the Halloween theme.
 *
 * Deliberately a release moment rather than a help screen — the app announcing
 * something about itself, the way a game announces a seasonal update. It fires
 * once a year; a flag that can nag is a flag that gets resented. `season.ts`
 * switches the theme on the first October open, which is what brings it up.
 *
 * The dialog is a full-screen stage rather than a `.sheet` itself, so the bat
 * sky can sit behind the card instead of flying across its text.
 *
 * The ornament is drawn pixel art rather than emoji. `CLAUDE.md` reserves
 * emoji for categories and weather — a job where a hand-drawn set was tried
 * and rightly rejected — but seasonal decoration in one window is a different
 * job, and emoji render as full-colour blobs that fight a two-tone palette.
 */

const SEEN_KEY = 'dateideas:seen-halloween'
/** Seen per year, so next October greets them again. */
const YEAR = String(new Date().getFullYear())

/** Decorative only — never announced, never a target. */
const GARLAND = [JACK, GHOST, BAT, JACK, GHOST, BAT, JACK]

function Garland({ className }: { className?: string }) {
  return (
    <p aria-hidden="true" className={`flex items-end justify-between px-3 ${className ?? ''}`}>
      {GARLAND.map((s, i) => (
        <PixelSprite key={i} sprite={s} size={26} />
      ))}
    </p>
  )
}

export default function SeasonGreeting() {
  const { theme } = useTheme()
  const ref = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (theme !== 'halloween') return
    let seen = false
    try {
      seen = localStorage.getItem(SEEN_KEY) === YEAR
    } catch {
      // Private mode. Showing it again is a far smaller sin than crashing.
    }
    if (!seen) setOpen(true)
  }, [theme])

  // A <dialog> can close itself without telling React, so the element is the
  // source of truth for "is it actually open".
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    else if (!open && el.open) el.close()
  }, [open])

  function dismiss() {
    try {
      localStorage.setItem(SEEN_KEY, YEAR)
    } catch {
      // It will greet them once more next time. Survivable.
    }
    setOpen(false)
  }

  return (
    <dialog ref={ref} className="season" onClose={dismiss} aria-labelledby="season-title">
      {open && <BatSky />}
      <div className="sheet season-card relative max-h-[80svh] overflow-y-auto">
        <Garland className="rise pt-3" />

        <div className="px-4 pb-4 pt-3 text-center">
          <p className="rise rise-1 legend text-[var(--color-deep)]">october update</p>
          <h2
            id="season-title"
            className="rise rise-1 mt-1 font-[family-name:var(--font-display)] text-2xl font-bold leading-tight"
          >
            spooky season
            <br />
            is upon us
          </h2>

          <p className="rise rise-2 prose mx-auto mt-3 [@media(max-height:760px)]:mt-2 max-w-[20rem] text-sm text-[var(--color-text)]/75">
            the pumpkins have moved in, the bats got into the calendar, and
            there&rsquo;s something on the map that wasn&rsquo;t there yesterday.
          </p>

          <ul className="rise rise-3 mx-auto mt-4 [@media(max-height:760px)]:mt-3 max-w-[18rem] space-y-2 text-left">
            <li className="pixel-box-sm flex items-center gap-3 p-2">
              <PixelSprite sprite={JACK} size={26} />
              <span className="text-sm">your hearts turned into pumpkins overnight</span>
            </li>
            <li className="pixel-box-sm flex items-center gap-3 p-2">
              <PixelSprite sprite={BAT} size={26} />
              <span className="text-sm">the map pins and calendar caught it too</span>
            </li>
            <li className="pixel-box-sm flex items-center gap-3 p-2">
              <PixelSprite sprite={GHOST} size={26} />
              <span className="text-sm">
                want pink back? tap the orange square at the top
              </span>
            </li>
          </ul>

          <button
            type="button"
            onClick={dismiss}
            className="rise rise-4 pixel-btn pixel-btn-primary mt-5 [@media(max-height:760px)]:mt-4 w-full px-4 py-3 text-base"
          >
            let&rsquo;s go
          </button>
        </div>

        {/* Dropped on short screens: iPhone Safari keeps its toolbar at the
            bottom, and the repeat of the top row was costing the bat sky. */}
        <Garland className="rise rise-4 pb-3 [@media(max-height:760px)]:hidden" />
      </div>
    </dialog>
  )
}
