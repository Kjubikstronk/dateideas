import { DEFAULT_THEME, writeTheme, type ThemeId } from './themes.ts'

/**
 * Spooky season: the one time the app picks a theme for you.
 *
 * On the first open in October the look flips to Halloween and the greeting
 * announces it — the way a game ships a seasonal update rather than hiding it
 * in a settings menu. It happens once per year, not on every open.
 *
 * It also has to leave. A theme the app applied by itself goes back to the
 * default once October ends; one the person chose from the menu stays, which
 * is why picking anything there clears the `AUTO_KEY` flag.
 */

export const SEASON_THEME: ThemeId = 'halloween'
export const ARRIVED_KEY = 'dateideas:season-arrived'
export const AUTO_KEY = 'dateideas:season-auto'

type Storageish = { getItem(k: string): string | null; setItem(k: string, v: string): void }

/** `today` is `yyyy-MM-dd`, like every date in this app. */
export const inSeason = (today: string): boolean => today.slice(5, 7) === '10'

/** Runs once per app open, before first render. Returns the theme to use. */
export function settleSeason(theme: ThemeId, today: string, store?: Storageish): ThemeId {
  try {
    const s = store ?? (globalThis as { localStorage?: Storageish }).localStorage
    if (!s) return theme
    const year = today.slice(0, 4)

    if (inSeason(today)) {
      if (s.getItem(ARRIVED_KEY) === year) return theme
      s.setItem(ARRIVED_KEY, year)
      if (theme === SEASON_THEME) return theme
      s.setItem(AUTO_KEY, '1')
      writeTheme(SEASON_THEME, s)
      return SEASON_THEME
    }

    if (s.getItem(AUTO_KEY) === '1') {
      s.setItem(AUTO_KEY, '0')
      if (theme === SEASON_THEME) {
        writeTheme(DEFAULT_THEME, s)
        return DEFAULT_THEME
      }
    }
    return theme
  } catch {
    // Private mode. No season is a far smaller loss than no app.
    return theme
  }
}

/** Called when the person picks a theme themselves: it is theirs now. */
export function keepChoice(store?: Storageish): void {
  try {
    const s = store ?? (globalThis as { localStorage?: Storageish }).localStorage
    s?.setItem(AUTO_KEY, '0')
  } catch {
    // Worst case the season takes its theme back in November.
  }
}
