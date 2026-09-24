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
  /**
   * Whether the palette is dark. Drives what CSS cannot reach — Google's own
   * map tiles, which otherwise stay a glaring white rectangle on a dark theme.
   */
  dark: boolean
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

/**
 * Carved, and squatter than the heart.
 *
 * A plain pumpkin is a circle with a bump, and it read as a pot: the earlier
 * two-row stalk was a chimney on a nearly square body. Shrinking the stalk to
 * one row and widening the body fixed the proportion; the carved face is what
 * actually gives it an identity, and it survives down to about 24px.
 *
 * Note the face holes are not lost in `bordered` mode — the halo fills any
 * empty cell touching a filled one, interior ones included, so the eyes and
 * mouth come out in ink. That is the right result here by luck rather than
 * design, and worth knowing before anyone "fixes" the halo.
 *
 * Below roughly 14px no pumpkin reads, including this one. That is a property
 * of the shape rather than the drawing: its identifying features are either
 * tiny or interior, where a heart's notch and a ghost's wavy hem are part of
 * the silhouette and survive the downscale.
 */
export const PUMPKIN = [
  '....XX...',
  '.XXXXXXX.',
  'XXXXXXXXX',
  'X.XXXXX.X',
  'XXXXXXXXX',
  '.X.XXX.X.',
  '..XXXXX..',
]

export const THEMES: Theme[] = [
  { id: 'pink', name: 'pink', glyph: HEART, dark: false },
  { id: 'halloween', name: 'halloween', glyph: PUMPKIN, dark: true },
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

export const isDark = (id: ThemeId): boolean =>
  (THEMES.find((t) => t.id === id) ?? THEMES[0]).dark

export const glyphFor = (id: ThemeId): string[] =>
  (THEMES.find((t) => t.id === id) ?? THEMES[0]).glyph
