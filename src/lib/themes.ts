/**
 * Which themes exist, and which one this browser is using.
 *
 * Colours are deliberately NOT here. `src/theme.css` owns every value, so the
 * stylesheet and the contrast gate can never disagree with each other; this
 * module carries only what CSS cannot express — ids, display names, and the
 * pixel grid each theme draws its glyph from.
 *
 * The choice is per-person and lives in localStorage. It is never written to
 * Firestore: one partner picking a look should not repaint the other's phone.
 */

export type ThemeId = 'pink' | 'halloween'

export type Theme = {
  id: ThemeId
  name: string
  /** Rows of a pixel grid; 'X' is filled. Must be rectangular. */
  glyph: string[]
}

/** The mark the whole app is built on. */
export const HEART = [
  '.XX...XX.',
  'XXXXXXXXX',
  'XXXXXXXXX',
  'XXXXXXXXX',
  '.XXXXXXX.',
  '..XXXXX..',
  '...XXX...',
  '....X....',
]

export const THEMES: Theme[] = [
  { id: 'pink', name: 'pink', glyph: HEART },
  { id: 'halloween', name: 'halloween', glyph: HEART },
]

export const DEFAULT_THEME: ThemeId = 'pink'
export const STORAGE_KEY = 'dateideas:theme'

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === 'string' && THEMES.some((t) => t.id === v)
}

/** Only the two methods this module needs, so tests can pass a plain object. */
type Storageish = { getItem(k: string): string | null; setItem(k: string, v: string): void }

/**
 * Anything unreadable, unknown or hostile resolves to the default. A stored id
 * can outlive the theme it names — a build that removes one must not leave the
 * app unstyled.
 */
export function readTheme(store?: Storageish): ThemeId {
  try {
    const s = store ?? (globalThis as { localStorage?: Storageish }).localStorage
    const raw = s?.getItem(STORAGE_KEY) ?? null
    return isThemeId(raw) ? raw : DEFAULT_THEME
  } catch {
    // Private mode throws on access. A theme is a nicety, not a requirement.
    return DEFAULT_THEME
  }
}

export function writeTheme(id: ThemeId, store?: Storageish): void {
  try {
    const s = store ?? (globalThis as { localStorage?: Storageish }).localStorage
    s?.setItem(STORAGE_KEY, id)
  } catch {
    // Same. The choice simply will not survive a reload.
  }
}

export const glyphFor = (id: ThemeId): string[] =>
  (THEMES.find((t) => t.id === id) ?? THEMES[0]).glyph
