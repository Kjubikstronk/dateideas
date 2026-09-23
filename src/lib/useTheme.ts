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
    // The default is the bare stylesheet, so it carries no attribute at all.
    if (theme === DEFAULT_THEME) root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
  }, [theme])

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState(id)
    writeTheme(id)
  }, [])

  return { theme, setTheme }
}
