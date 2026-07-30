/**
 * WCAG contrast audit for the palette, including the faded `/opacity` variants
 * used throughout the UI — those are where a bright theme quietly fails, since
 * `text-ink/50` on white is a much lighter grey than the token suggests.
 *
 *   node scripts/check-contrast.mjs
 */

const T = {
  ink: '#1A1033',
  paper: '#FFE5F1',
  card: '#FFFDFE',
  hot: '#FF5CA8',
  deep: '#B31E67',
  lav: '#B8A6FF',
  aqua: '#5BE0E6',
  mute: '#6B6480',
}

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
const CASES = [
  ['body text (ink on card)', T.ink, T.card, 1, 'normal'],
  ['body text (ink on paper)', T.ink, T.paper, 1, 'normal'],
  ['error text (deep on card)', T.deep, T.card, 1, 'normal'],
  ['cancel note (mute on card)', T.mute, T.card, 1, 'normal'],
  ['delete button (card on deep)', T.card, T.deep, 1, 'normal'],
  ['device title (ink on hot)', T.ink, T.hot, 1, 'large'],
  ['primary button (ink on hot)', T.ink, T.hot, 1, 'normal'],
  ['selected day (ink on hot)', T.ink, T.hot, 1, 'normal'],
  ['note 75% on card', T.ink, T.card, 0.75, 'normal'],
  ['legend 70% on card', T.ink, T.card, 0.7, 'normal'],
  ['secondary 60% on card', T.ink, T.card, 0.6, 'normal'],
  ['placeholder 60% on card', T.ink, T.card, 0.6, 'normal'],
  ['outside-month day 60%', T.ink, T.card, 0.6, 'normal'],
  ['linked day (ink on lav)', T.ink, T.lav, 1, 'normal'],
  ['done marker (ink on aqua)', T.ink, T.aqua, 1, 'normal'],
  // Kept as a guard: this is why `deep` exists and `hot` is never text.
  ['NEVER USED: hot as text on paper', T.hot, T.paper, 1, 'normal'],
]

let failures = 0
console.log('\n  ratio   AA    case')
console.log('  ' + '─'.repeat(56))

for (const [label, fg, bg, alpha, size] of CASES) {
  const bgRgb = hex(bg)
  const fgRgb = alpha === 1 ? hex(fg) : over(hex(fg), bgRgb, alpha)
  const r = ratio(fgRgb, bgRgb)
  const need = size === 'large' ? 3.0 : 4.5
  const pass = r >= need
  const informational = label.startsWith('NEVER USED')
  if (!pass && !informational) failures++
  console.log(
    `  ${r.toFixed(2).padStart(5)}  ${(pass ? 'pass' : 'FAIL').padEnd(5)} ${label}` +
      (size === 'large' ? '  (large text, needs 3.0)' : ''),
  )
}

console.log('\n  ' + (failures ? `${failures} real failure(s)` : 'all real cases pass') + '\n')
process.exit(failures ? 1 : 0)
