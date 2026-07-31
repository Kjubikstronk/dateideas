/**
 * Hand-drawn pixel stickers, replacing the emoji.
 *
 * The emoji were the only thing in the app that didn't belong to it: full
 * colour, someone else's drawing style, and illegible at the 8px the calendar
 * needs. These share the heart's grid, the ink outline and the app's palette,
 * so a sticker sits next to a pin and reads as the same world.
 *
 * Deliberately no new colours. Four accents plus ink and white is a hard
 * constraint — a pink ramen bowl is fine, it's an icon rather than a
 * photograph, and staying in palette is what makes the set cohere.
 *
 *   .  transparent      X  ink (structure and outline)
 *   #  the accent       o  white (highlights, holes)
 */

type Glyph = { rows: string[]; accent: string }

const HOT = 'var(--color-hot)'
const LAV = 'var(--color-lav)'
const AQUA = 'var(--color-aqua)'
const DEEP = 'var(--color-deep)'

export const STICKERS: Record<string, Glyph> = {
  ramen: {
    accent: HOT,
    rows: [
      '..#...#..',
      '...#.#...',
      '..#...#..',
      '.........',
      'XXXXXXXXX',
      'X#######X',
      '.X#####X.',
      '..XXXXX..',
      '.........',
    ],
  },
  pizza: {
    accent: HOT,
    rows: [
      '....X....',
      '...X#X...',
      '...X#X...',
      '..X#o#X..',
      '..X###X..',
      '.X#o#o#X.',
      '.X#####X.',
      '.XXXXXXX.',
      '.........',
    ],
  },
  coffee: {
    accent: DEEP,
    rows: [
      '...#.#...',
      '..#...#..',
      '.........',
      'XXXXXXX..',
      'X#####XXX',
      'X#####X.X',
      'X#####XXX',
      '.XXXXX...',
      '.........',
    ],
  },
  icecream: {
    accent: LAV,
    rows: [
      '...XXX...',
      '..X###X..',
      '.X#####X.',
      '.X#o###X.',
      '..XXXXX..',
      '..X###X..',
      '...X#X...',
      '....X....',
      '.........',
    ],
  },
  wine: {
    accent: DEEP,
    rows: [
      '.XXXXXXX.',
      '.X#####X.',
      '..X###X..',
      '...XXX...',
      '....X....',
      '....X....',
      '....X....',
      '.XXXXXXX.',
      '.........',
    ],
  },
  cinema: {
    accent: LAV,
    rows: [
      'XXXXXXXXX',
      'XoXX#XXoX',
      'XXXX#XXXX',
      'XoXX#XXoX',
      'XXXX#XXXX',
      'XoXX#XXoX',
      'XXXXXXXXX',
      '.........',
      '.........',
    ],
  },
  balloon: {
    accent: AQUA,
    rows: [
      '..XXXXX..',
      '.X#####X.',
      'X#o#####X',
      'X#######X',
      '.X#####X.',
      '..X###X..',
      '...XXX...',
      '....X....',
      '...X.X...',
    ],
  },
  art: {
    accent: HOT,
    rows: [
      '.....XXX.',
      '....X##X.',
      '...X##X..',
      '..X##X...',
      '..X#X....',
      '.X##X....',
      'XXXX.....',
      'XXX......',
      '.........',
    ],
  },
  arcade: {
    accent: LAV,
    rows: [
      '....X....',
      '...X#X...',
      '...X#X...',
      '...X#X...',
      '..XXXXX..',
      '.X#####X.',
      'X#o###o#X',
      'XXXXXXXXX',
      '.........',
    ],
  },
  bowling: {
    accent: AQUA,
    rows: [
      '...XXX...',
      '..X###X..',
      '..X###X..',
      '...X#X...',
      '...X#X...',
      '..X###X..',
      '.X#####X.',
      '.XXXXXXX.',
      '.........',
    ],
  },
  winter: {
    accent: AQUA,
    rows: [
      '....X....',
      '.X..X..X.',
      '..X.X.X..',
      '...XXX...',
      'XXXXXXXXX',
      '...XXX...',
      '..X.X.X..',
      '.X..X..X.',
      '....X....',
    ],
  },
  park: {
    accent: AQUA,
    rows: [
      '....X....',
      '..XX#XX..',
      '.X#####X.',
      'X##XXX##X',
      '.X#####X.',
      '..XX#XX..',
      '....X....',
      '....X....',
      '..XXXXX..',
    ],
  },
  beach: {
    accent: HOT,
    rows: [
      '....X....',
      '..XXXXX..',
      '.X#####X.',
      'X#######X',
      'XXXXXXXXX',
      '....X....',
      '....X....',
      '.........',
      '.XX.XX.XX',
    ],
  },
  sunset: {
    accent: HOT,
    rows: [
      '.........',
      '...XXX...',
      '..X###X..',
      '.X#####X.',
      '.X#####X.',
      'XXXXXXXXX',
      '.........',
      'X.XXX.XXX',
      '.........',
    ],
  },
  picnic: {
    accent: LAV,
    rows: [
      '..XXXXX..',
      '.X.....X.',
      'XXXXXXXXX',
      'X#o#o#o#X',
      'X#o#o#o#X',
      'X#o#o#o#X',
      '.XXXXXXX.',
      '.........',
      '.........',
    ],
  },
  music: {
    accent: HOT,
    rows: [
      '....XXXX.',
      '....X##X.',
      '....XXXX.',
      '....X....',
      '....X....',
      '.XXXX....',
      'X##X.....',
      'X##X.....',
      '.XX......',
    ],
  },
}

export type StickerId = keyof typeof STICKERS

/** Order shown in the picker. */
export const STICKER_IDS = Object.keys(STICKERS) as StickerId[]

const W = 9
const H = 9

type Props = {
  id: string
  size?: number
  /** One-pixel ink halo, for sitting on a map or a coloured fill. */
  bordered?: boolean
  className?: string
}

export default function PixelSticker({ id, size = 24, bordered, className }: Props) {
  const glyph = STICKERS[id] ?? STICKERS.ramen
  const pad = bordered ? 1 : 0
  const vw = W + pad * 2
  const vh = H + pad * 2

  const at = (x: number, y: number) =>
    y >= 0 && y < H && x >= 0 && x < W ? glyph.rows[y][x] : '.'

  const cells: React.ReactElement[] = []
  const px = (x: number, y: number, fill: string) =>
    cells.push(
      <rect key={`${fill}-${x}-${y}`} x={x + pad} y={y + pad} width={1} height={1} fill={fill} />,
    )

  if (bordered) {
    for (let y = -1; y <= H; y++) {
      for (let x = -1; x <= W; x++) {
        if (at(x, y) !== '.') continue
        let touches = false
        for (let dy = -1; dy <= 1 && !touches; dy++) {
          for (let dx = -1; dx <= 1 && !touches; dx++) {
            if (at(x + dx, y + dy) !== '.') touches = true
          }
        }
        if (touches) px(x, y, 'var(--color-ink)')
      }
    }
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = at(x, y)
      if (c === '.') continue
      px(x, y, c === 'X' ? 'var(--color-ink)' : c === 'o' ? 'var(--color-card)' : glyph.accent)
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${vw} ${vh}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {cells}
    </svg>
  )
}
