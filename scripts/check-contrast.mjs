/**
 * WCAG contrast audit for the palette, including the faded `/opacity` variants
 * used throughout the UI — those are where a bright theme quietly fails, since
 * `text-ink/50` on white is a much lighter grey than the token suggests.
 *
 *   node scripts/check-contrast.mjs
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const CSS = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'theme.css')

/**
 * The stylesheet is the single source of truth for colour. Parsing it here
 * rather than keeping a second copy means this gate can never pass against
 * values that no longer ship, and any theme added later is checked the moment
 * it exists.
 *
 * Returns { pink: {...}, <theme>: {...} } — `pink` is the @theme block, each
 * other key a [data-theme="..."] block layered over it.
 */
export function readThemes(cssPath = CSS) {
  const css = readFileSync(cssPath, 'utf8')
  const tokens = (block) =>
    Object.fromEntries(
      [...block.matchAll(/--color-([a-z-]+)\s*:\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]),
    )

  const base = css.match(/@theme\s*\{([\s\S]*?)\n\}/)
  if (!base) throw new Error(`no @theme block found in ${cssPath}`)
  const themes = { pink: tokens(base[1]) }

  for (const m of css.matchAll(/\[data-theme=["']([a-z-]+)["']\]\s*\{([\s\S]*?)\n\s*\}/g)) {
    themes[m[1]] = { ...themes.pink, ...tokens(m[2]) }
  }
  return themes
}

const T = readThemes().pink

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))

const lum = ([r, g, b]) => {
  const f = (c) => {
    c /= 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

const ratio = (fg, bg) => {
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}

/** Text drawn at `alpha` over an opaque background composites to this colour. */
const over = (fg, bg, alpha) => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha))

// [label, foreground, background, alpha, size]
// "large" = >=18.66px bold or >=24px, which has a lower AA bar (3.0 vs 4.5).
// A function of the palette, so every theme is measured, not just the default.
const casesFor = (T) => [
  ['body text (text on card)', T.text, T.card, 1, 'normal'],
  ['body text (text on paper)', T.text, T.paper, 1, 'normal'],
  ['accent text (deep on card)', T.deep, T.card, 1, 'normal'],
  ['cancel note (mute on card)', T.mute, T.card, 1, 'normal'],
  ['delete button (card on deep)', T.card, T.deep, 1, 'normal'],
  ['device title (on-fill on hot)', T['on-fill'], T.hot, 1, 'large'],
  ['primary button (on-fill on hot)', T['on-fill'], T.hot, 1, 'normal'],
  ['selected day (on-fill on hot)', T['on-fill'], T.hot, 1, 'normal'],
  ['note 75% on card', T.text, T.card, 0.75, 'normal'],
  ['legend 70% on card', T.text, T.card, 0.7, 'normal'],
  ['secondary 60% on card', T.text, T.card, 0.6, 'normal'],
  ['placeholder 60% on card', T.text, T.card, 0.6, 'normal'],
  ['outside-month day 60%', T.text, T.card, 0.6, 'normal'],
  ['linked day (on-fill on lav)', T['on-fill'], T.lav, 1, 'normal'],
  ['done marker (on-fill on aqua)', T['on-fill'], T.aqua, 1, 'normal'],
]

let failures = 0
for (const [name, T] of Object.entries(readThemes())) {
  console.log(`\n  ${name}`)
  console.log('  ratio   AA    case')
  console.log('  ' + '-'.repeat(56))
  for (const [label, fg, bg, alpha, size] of casesFor(T)) {
    const bgRgb = hex(bg)
    const fgRgb = alpha === 1 ? hex(fg) : over(hex(fg), bgRgb, alpha)
    const r = ratio(fgRgb, bgRgb)
    const need = size === 'large' ? 3.0 : 4.5
    const pass = r >= need
    if (!pass) failures++
    console.log(
      `  ${r.toFixed(2).padStart(5)}  ${(pass ? 'pass' : 'FAIL').padEnd(5)} ${label}` +
        (size === 'large' ? '  (large text, needs 3.0)' : ''),
    )
  }
}

console.log('\n  ' + (failures ? `${failures} failure(s)` : 'all themes pass') + '\n')
process.exit(failures ? 1 : 0)
