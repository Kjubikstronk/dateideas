import { useEffect, useRef, useState } from 'react'
import { THEMES } from '../lib/themes'
import { useTheme } from '../lib/useTheme'
import { keepChoice } from '../lib/season'

/**
 * The look menu: a bezel button that opens a list of every registered theme.
 *
 * A list rather than a toggle because the registry is meant to grow — a
 * two-state switch stops making sense the moment a third theme exists, and
 * swapping it out later would mean relearning where the control is.
 *
 * Each row scopes `data-theme` to itself, so a swatch paints from that theme's
 * own tokens. Adding a theme to theme.css and the registry is all it takes to
 * appear here correctly; this file never names a colour.
 */
export default function ThemeMenu() {
  const { theme, setTheme } = useTheme()
  const ref = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)

  // A <dialog> can close itself — Escape, the backdrop — without telling
  // React, so the element stays the source of truth for whether it is open.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    else if (!open && el.open) el.close()
  }, [open])

  if (THEMES.length < 2) return null

  const current = THEMES.find((t) => t.id === theme)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`look: ${current?.name ?? theme}. change it`}
        className="pixel-btn flex h-11 w-11 items-center justify-center p-0"
      >
        <span
          aria-hidden="true"
          data-theme={theme}
          className="block h-5 w-5 border-2 border-[var(--color-line)] bg-[var(--color-hot)]"
        />
      </button>

      <dialog
        ref={ref}
        className="sheet"
        onClose={() => setOpen(false)}
        aria-labelledby="look-title"
      >
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2
              id="look-title"
              className="font-[family-name:var(--font-display)] text-lg font-bold"
            >
              look
            </h2>
            <button
              type="button"
              className="pixel-btn legend px-2 py-1"
              onClick={() => setOpen(false)}
            >
              close
            </button>
          </div>

          <ul className="space-y-2">
            {THEMES.map((t) => {
              const active = t.id === theme
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      keepChoice()
                      setTheme(t.id)
                      setOpen(false)
                    }}
                    aria-pressed={active}
                    className={[
                      'pixel-btn flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left',
                      active ? 'pixel-btn-primary' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {/* Scoped to its own theme, so it shows that palette
                        rather than the one currently applied. */}
                    <span
                      aria-hidden="true"
                      data-theme={t.id}
                      className="flex shrink-0 gap-1"
                    >
                      <span className="block h-5 w-5 border-2 border-[var(--color-line)] bg-[var(--color-paper)]" />
                      <span className="block h-5 w-5 border-2 border-[var(--color-line)] bg-[var(--color-hot)]" />
                      <span className="block h-5 w-5 border-2 border-[var(--color-line)] bg-[var(--color-card)]" />
                    </span>
                    <span className="flex-1">{t.name}</span>
                    {active && <span className="legend">on</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </dialog>
    </>
  )
}
