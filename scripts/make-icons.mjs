/**
 * Generates the PWA / home-screen icons from the same pixel heart the app uses.
 *
 * Written by hand rather than pulled from a library because the image is a
 * literal pixel grid — nearest-neighbour scaling of a 9x8 bitmap is a few lines
 * of arithmetic, and adding a raster dependency to draw eight squares would be
 * silly. iOS needs PNG for apple-touch-icon, so SVG alone wouldn't do.
 *
 *   node scripts/make-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HEART = [
  '.XX...XX.',
  'XXXXXXXXX',
  'XXXXXXXXX',
  'XXXXXXXXX',
  '.XXXXXXX.',
  '..XXXXX..',
  '...XXX...',
  '....X....',
]

const INK = [0x1a, 0x10, 0x33]
const HOT = [0xff, 0x5c, 0xa8]

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

function png(width, height, rgb) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(rgb, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Drawing ─────────────────────────────────────────────────────────────────

/**
 * @param size    output edge length in px
 * @param inset   fraction of the canvas left as background around the heart.
 *                Maskable icons get cropped to a circle on Android, so the
 *                glyph has to sit inside the safe zone.
 */
function render(size, inset) {
  const gw = HEART[0].length
  const gh = HEART.length
  const cell = Math.floor((size * (1 - inset * 2)) / gw)
  const drawW = cell * gw
  const drawH = cell * gh
  const offX = Math.floor((size - drawW) / 2)
  const offY = Math.floor((size - drawH) / 2)

  // One filter byte (0 = None) per scanline, then RGB triples.
  const stride = size * 3 + 1
  const raw = Buffer.alloc(stride * size)

  for (let y = 0; y < size; y++) {
    const rowStart = y * stride
    raw[rowStart] = 0
    for (let x = 0; x < size; x++) {
      const gx = Math.floor((x - offX) / cell)
      const gy = Math.floor((y - offY) / cell)
      const lit =
        gx >= 0 && gx < gw && gy >= 0 && gy < gh && HEART[gy][gx] === 'X'
      const [r, g, b] = lit ? HOT : INK
      const p = rowStart + 1 + x * 3
      raw[p] = r
      raw[p + 1] = g
      raw[p + 2] = b
    }
  }

  return png(size, size, raw)
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
mkdirSync(outDir, { recursive: true })

const targets = [
  ['icon-192.png', 192, 0.16],
  ['icon-512.png', 512, 0.16],
  // Android maskable icons are cropped hard; give the heart more room.
  ['icon-maskable-512.png', 512, 0.26],
  // iOS does not round-crop, so it can be tighter.
  ['apple-touch-icon.png', 180, 0.14],
]

for (const [name, size, inset] of targets) {
  writeFileSync(join(outDir, name), render(size, inset))
  console.log(`wrote public/${name}  (${size}x${size})`)
}
