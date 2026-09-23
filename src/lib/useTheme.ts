import { useCallback, useEffect, useState } from 'react'
import { readTheme, writeTheme, DEFAULT_THEME, type ThemeId } from './themes'

/**
 * The active theme.
 *
 * `index.html` has already stamped `data-theme` before first paint, so this
 * does not cause the switch — it re-asserts it from the validated value, which
 * also corrects an unknown id left behind by an older build.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(() => readTheme())

  useEffect(() => {
    const root = document.documentElement

    /**
     * Swapping the palette changes colour, background, border and shadow on
     * nearly every element at once. `.pixel-btn` transitions its box-shadow,
     * so without this every button in the app animates its shadow colour
     * together and the switch smears instead of snapping.
     *
     * Reading `offsetHeight` forces the new values to be computed while
     * transitions are off, which is what makes this work synchronously — the
     * usual recipe defers the cleanup to requestAnimationFrame, and this
     * project's notes are explicit that nothing may depend on rAF alone.
     */
    const halt = document.createElement('style')
    halt.textContent = '*,*::before,*::after{transition:none !important}'
    document.head.appendChild(halt)

    // The default is the bare stylesheet, so it carries no attribute at all.
    if (theme === DEFAULT_THEME) root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)

    void root.offsetHeight
    halt.remove()
  }, [theme])

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState(id)
    writeTheme(id)
  }, [])

  return { theme, setTheme }
}
