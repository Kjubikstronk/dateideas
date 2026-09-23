/**
 * Rasterises a glyph at the sizes the app actually renders, so shape decisions
 * rest on evidence rather than on how it looks blown up.
 *
 * The calendar markers draw at 8px. A shape that reads beautifully at 96px can
 * lose the one feature that identifies it by the time it gets there — an
 * 11-wide heart once looked roundest at full size and rasterised identically
 * to the old one at 8px.
 *
 *   node scripts/check-glyph.mjs <NAME>
 */
import { THEMES, HEART } from '../src/lib/themes.ts'

const GRIDS = { HEART, ...Object.fromEntries(THEMES.map((t) => [t.id.toUpperCase(), t.glyph])) }
const name = (process.argv[2] ?? 'HEART').toUpperCase()
const grid = GRIDS[name]
if (!grid) {
  console.error(`unknown glyph ${name}; try one of: ${Object.keys(GRIDS).join(', ')}`)
  process.exit(1)
}

const W = grid[0].length
const H = grid.length
for (const size of [8, 11, 14, 24]) {
  const h = Math.round((size / W) * H)
  console.log(`\n  ${name} at ${size}px  (${size}x${h} from a ${W}x${H} grid)`)
  for (let y = 0; y < h; y++) {
    let row = ''
    for (let x = 0; x < size; x++) {
      // Nearest neighbour, which is what shape-rendering:crispEdges approximates.
      const gx = Math.min(W - 1, Math.floor((x * W) / size))
      const gy = Math.min(H - 1, Math.floor((y * H) / h))
      row += grid[gy][gx] === 'X' ? '#' : '.'
    }
    console.log('  ' + row)
  }
}
