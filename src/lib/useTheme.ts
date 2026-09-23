import { useSyncExternalStore } from 'react'
import { readTheme, writeTheme, DEFAULT_THEME, type ThemeId } from './themes'

/**
 * The active theme, as one shared value.
 *
 * This deliberately is NOT `useState` inside the hook. Every component calling
 * it would get its own independent copy, and the bug that causes is subtle:
 * the palette would still change, because `data-theme` lives on <html> and CSS
 * does not care who set it — but anything driven by the *value* would not.
 * That is exactly what happened. Switching back to pink recoloured the app and
 * left every glyph a pumpkin, because each PixelHeart was still holding the
 * theme it had read at mount.
 */

let current: ThemeId = readTheme()
const listeners = new Set<() => void>()

/**
 * Swapping the palette changes colour, background, border and shadow on nearly
 * every element at once, and `.pixel-btn` transitions its box-shadow — without
 * this, every button animates its shadow colour together and the switch smears
 * instead of snapping.
 *
 * Reading `offsetHeight` forces the new values to be computed while
 * transitions are off, which is what lets the halt be lifted in the same tick.
 * The usual recipe defers that to requestAnimationFrame; this project's notes
 * are explicit that nothing may depend on rAF alone.
 */
function apply(id: ThemeId) {
  if (typeof document === 'undefined') return
  const root = document.documentElement

  const halt = document.createElement('style')
  halt.textContent = '*,*::before,*::after{transition:none !important}'
  document.head.appendChild(halt)

  // The default is the bare stylesheet, so it carries no attribute at all.
  if (id === DEFAULT_THEME) root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', id)

  void root.offsetHeight
  halt.remove()
}

// The inline script in index.html has already stamped an attribute before
// paint, but it does not validate. Re-asserting the parsed value here corrects
// an unknown id left behind by an older build.
apply(current)

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

export function setTheme(id: ThemeId) {
  if (id === current) return
  current = id
  writeTheme(id)
  apply(id)
  for (const l of listeners) l()
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  )
  return { theme, setTheme }
}
