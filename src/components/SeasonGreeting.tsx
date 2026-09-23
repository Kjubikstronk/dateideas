import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../lib/useTheme'
import PixelSprite, { BAT, GHOST, JACK } from './PixelSprite'

/**
 * The one-time "spooky season is upon us" notice, shown the first time this
 * browser lands in the Halloween theme.
 *
 * Deliberately a release moment rather than a help screen — the app announcing
 * something about itself, the way a game announces a seasonal update. It fires
 * once and then never again; a flag that can nag is a flag that gets resented.
 *
 * The ornament is drawn pixel art rather than emoji. `CLAUDE.md` reserves
 * emoji for categories and weather — a job where a hand-drawn set was tried
 * and rightly rejected — but seasonal decoration in one window is a different
 * job, and emoji render as full-colour blobs that fight a two-tone palette.
 */

const SEEN_KEY = 'dateideas:seen-halloween'

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
      seen = localStorage.getItem(SEEN_KEY) === '1'
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
      localStorage.setItem(SEEN_KEY, '1')
    } catch {
      // It will greet them once more next time. Survivable.
    }
    setOpen(false)
  }

  return (
    <dialog ref={ref} className="sheet" onClose={dismiss} aria-labelledby="season-title">
      <div className="max-h-[80svh] overflow-y-auto">
        <Garland className="pt-3" />

        <div className="px-4 pb-4 pt-3 text-center">
          <p className="legend text-[var(--color-deep)]">october update</p>
          <h2
            id="season-title"
            className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold leading-tight"
          >
            spooky season
            <br />
            is upon us
          </h2>

          <p className="prose mx-auto mt-3 max-w-[20rem] text-sm text-[var(--color-text)]/75">
            the pumpkins have moved in, the bats got into the calendar, and
            there&rsquo;s something on the map that wasn&rsquo;t there yesterday.
          </p>

          <ul className="mx-auto mt-4 max-w-[18rem] space-y-2 text-left">
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
                had enough? the swatch up in the corner puts it back
              </span>
            </li>
          </ul>

          <button
            type="button"
            onClick={dismiss}
            className="pixel-btn pixel-btn-primary mt-5 w-full px-4 py-3 text-base"
          >
            let&rsquo;s go
          </button>
        </div>

        <Garland className="pb-3" />
      </div>
    </dialog>
  )
}
