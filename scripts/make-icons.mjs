/**
 * Generates the favicon and the PWA / home-screen icons from the same pixel
 * heart the app uses.
 *
 * Written by hand rather than pulled from a library because the image is a
 * literal pixel grid — nearest-neighbour scaling of a bitmap is a few lines of
 * arithmetic, and adding a raster dependency to draw a few squares would be
 * silly. iOS needs PNG for apple-touch-icon, so SVG alone wouldn't do.
 *
 * The heart was a flat pink silhouette on ink, which read as a smudge at tab
 * size. It now gets the same treatment the rest of the app gives it: a hard
 * offset shadow with no blur, the ink halo PixelHeart already draws for map
 * pins, and two sparkles. Every colour is a palette token.
 *
 *   node scripts/make-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The lobes are two rows tall, not one.
 *
 * With a single row they were bumps on a flat slab, and at the sizes this
 * actually renders the notch between them closed up entirely: rasterised at
 * 8px — the calendar markers — the old glyph came out `+##++##+`, with the
 * gap filled by partial coverage. Two rows survive the downscale as
 * `+##..##+`, so the one feature that makes it read as a heart holds at every
 * size in the app.
 */
const HEART = [
  '.XX...XX.',
  '.XX...XX.',
  'XXXXXXXXX',
  'XXXXXXXXX',
  'XXXXXXXXX',
  '.XXXXXXX.',
  '..XXXXX..',
  '...XXX...',
  '....X....',
]

const INK = '#1A1033'
const CARD = '#FFFDFE'
const HOT = '#FF5CA8'
const DEEP = '#B31E67'
const LAV = '#B8A6FF'
const AQUA = '#5BE0E6'

/** Everything is composed on this grid, then scaled up by whole pixels. */
const N = 16
/** Top-left of the 9x9 heart within the grid. Taller lobes pushed the halo up
    into the aqua sparkle at HY=3, so the glyph sits one row lower. */
const HX = 3
const HY = 4

const lit = []
HEART.forEach((row, y) => [...row].forEach((c, x) => c === 'X' && lit.push([x, y])))
const isLit = new Set(lit.map(([x, y]) => `${x},${y}`))

/**
 * @param border  edge colour, or null for the maskable icon — Android crops
 *                that one to a circle, so a frame would be sliced off.
 * @param sparkles [x, y, colour] centres of five-pixel plus shapes.
 */
function compose({ border, sparkles }) {
  const g = Array.from({ length: N }, () => Array(N).fill(LAV))

  if (border) {
    for (let i = 0; i < N; i++) {
      g[0][i] = border
      g[N - 1][i] = border
      g[i][0] = border
      g[i][N - 1] = border
    }
  }

  // Shadow first, one pixel down and right. Hard edge, no blur — the same
  // offset the cards and buttons use.
  for (const [x, y] of lit) set(g, x + HX + 1, y + HY + 1, DEEP)

  // The ink halo, only over untouched background so it never eats the shadow.
  for (const [x, y] of lit) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (isLit.has(`${x + dx},${y + dy}`)) continue
        const px = x + dx + HX
        const py = y + dy + HY
        if (g[py]?.[px] === LAV) g[py][px] = INK
      }
    }
  }

  for (const [x, y] of lit) set(g, x + HX, y + HY, HOT)

  for (const [cx, cy, colour] of sparkles) {
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      set(g, cx + dx, cy + dy, colour)
    }
  }
  return g
}

function set(g, x, y, colour) {
  if (g[y]?.[x] !== undefined) g[y][x] = colour
}

/**
 * The browser tab is the one place the icon stays a square, so that is the one
 * place it gets a frame. Every phone rounds or masks its icons, and a hard
 * square border under a rounded mask loses its corners and reads as broken.
 */
const FAVICON = compose({ border: INK, sparkles: [[12, 2, AQUA], [3, 12, CARD]] })

/**
 * The installed icon: full bleed, no frame. The sparkles sit in the corners,
 * clear of the heart and its halo — pulled any further in and they land on
 * the glyph itself. An iOS squircle keeps enough corner for both.
 */
const APP = compose({ border: null, sparkles: [[12, 2, AQUA], [3, 12, CARD]] })

/**
 * Android crops this one to a circle, and a circle that fits a heart this size
 * has no corner left to put a sparkle in — every position that clears the
 * glyph falls outside the safe zone. So it goes without, rather than shipping
 * an icon with two sparkles sliced in half.
 */
const MASKABLE = compose({ border: null, sparkles: [] })

// ── PNG encoding ────────────────────────────────────────────────────────────

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

const rgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]

/** Every size is a whole multiple of the grid, so no cell comes out uneven. */
function png(grid, size) {
  const cell = size / N
  if (!Number.isInteger(cell)) throw new Error(`${size} is not a multiple of ${N}`)

  const stride = size * 3 + 1
  const raw = Buffer.alloc(stride * size)
  for (let y = 0; y < size; y++) {
    const rowStart = y * stride
    raw[rowStart] = 0 // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b] = rgb(grid[(y / cell) | 0][(x / cell) | 0])
      const p = rowStart + 1 + x * 3
      raw[p] = r
      raw[p + 1] = g
      raw[p + 2] = b
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Runs of one colour merge into a single rect, which keeps the file small. */
function svg(grid) {
  let rects = ''
  grid.forEach((row, y) => {
    let x = 0
    while (x < N) {
      let w = 1
      while (x + w < N && row[x + w] === row[x]) w++
      rects += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${row[x]}"/>`
      x += w
    }
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges">${rects}</svg>\n`
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
mkdirSync(outDir, { recursive: true })

const targets = [
  ['icon-192.png', APP, 192],
  ['icon-512.png', APP, 512],
  ['icon-maskable-512.png', MASKABLE, 512],
  // 192 rather than the conventional 180: 180 is not a whole multiple of the
  // 16px grid, and iOS scales this happily either way.
  ['apple-touch-icon.png', APP, 192],
]

for (const [name, grid, size] of targets) {
  writeFileSync(join(outDir, name), png(grid, size))
  console.log(`wrote public/${name}  (${size}x${size})`)
}
writeFileSync(join(outDir, 'favicon.svg'), svg(FAVICON))
console.log('wrote public/favicon.svg')

// Not shipped — a look at the installed icon behind an iOS-style squircle, so
// the corner treatment can be judged before it reaches a home screen.
if (process.argv.includes('--preview')) {
  const size = 512
  const grid = APP
  const cell = size / N
  const stride = size * 3 + 1
  const raw = Buffer.alloc(stride * size)
  const r0 = size / 2
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0
    for (let x = 0; x < size; x++) {
      // Superellipse, the shape iOS actually uses.
      const dx = Math.abs(x - r0 + 0.5) / r0
      const dy = Math.abs(y - r0 + 0.5) / r0
      const inside = Math.pow(dx, 5) + Math.pow(dy, 5) <= 1
      const [r, g, b] = inside ? rgb(grid[(y / cell) | 0][(x / cell) | 0]) : [0x22, 0x22, 0x22]
      const p = y * stride + 1 + x * 3
      raw[p] = r
      raw[p + 1] = g
      raw[p + 2] = b
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  writeFileSync(join(outDir, '..', 'icon-preview.png'), Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]))
  console.log('wrote icon-preview.png (squircle preview, not shipped)')
}
