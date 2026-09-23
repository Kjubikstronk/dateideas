/**
 * Seasonal pixel art, and a renderer for it.
 *
 * `PixelHeart` stays separate: it is the app's mark, it carries the theme
 * glyph, and it must survive 8px in the calendar markers. These have no such
 * limit — they only ever appear in one window at 20px and up, which is why
 * they can afford eyes, teeth and a shaded side.
 *
 * `CLAUDE.md` reserves emoji for categories and weather, where a hand-drawn
 * set was tried and rightly rejected. Seasonal ornament in a single window is
 * a different job, and emoji render as full-colour blobs that fight a two-tone
 * palette.
 *
 * The colours here are literals rather than tokens on purpose. These are
 * artwork, not chrome — a jack-o'-lantern is orange whatever the UI is doing,
 * and the Halloween palette's `deep` is a *lighter* orange, so it cannot serve
 * as this pumpkin's shadow.
 */

const ORANGE = '#FF7518'
const ORANGE_DARK = '#B3410E'
const STALK = '#4A7C2A'
const BONE = '#F2E9DC'
const BONE_SHADE = '#C9BFB2'
const PURPLE = '#B388FF'
const PURPLE_DARK = '#6B4BB8'
const GLOW = '#7CFC5A'
const DARK = '#241539'

export type Sprite = {
  /** Rows of a grid. '.' is empty; every other char keys into `colors`. */
  grid: string[]
  colors: Record<string, string>
  /** For the accessible name when a sprite is not purely decorative. */
  label: string
}

export const JACK: Sprite = {
  grid: [
    '......XX.....',
    '.....XX......',
    '..HHHHHHHHH..',
    '.HHHHHHHHHHH.',
    'HHHHHHHHHHHHH',
    'HHKKHHHKKHHHH',
    'HHKKHHHKKHHHD',
    'HHHHHKHHHHHHD',
    'HKKKKKKKKKHHD',
    'HHKHKHKHKHHHD',
    'HHHHHHHHHHHDD',
    '.HHHHHHHHHDD.',
    '..HHHHHHHDD..',
  ],
  colors: { H: ORANGE, D: ORANGE_DARK, K: DARK, X: STALK },
  label: 'jack-o-lantern',
}

export const GHOST: Sprite = {
  grid: [
    '...BBBBB...',
    '..BBBBBBB..',
    '.BBBBBBBBB.',
    'BBBBBBBBBBS',
    'BBKKBBBKKBS',
    'BBKKBBBKKBS',
    'BBBBBBBBBBS',
    'BBBBKKKBBBS',
    'BBBBBBBBBBS',
    'BBBBBBBBBSS',
    'BBBBBBBBBSS',
    'B.BB.BB.BS.',
  ],
  colors: { B: BONE, S: BONE_SHADE, K: DARK },
  label: 'ghost',
}

export const BAT: Sprite = {
  grid: [
    '..L.......L..',
    '..LL.....LL..',
    'LLLLL...LLLLL',
    'LLLLLLLLLLLLL',
    'LLLAKLLLKALLL',
    'LLLAALLLAALLL',
    'DLLLLWWWLLLLD',
    '.DLLLLLLLLLD.',
    '..DLL.L.LLD..',
    '...D..L..D...',
  ],
  // Glowing eyes rather than dark ones: a dark pupil on a dark-ish body
  // disappears by 20px, which is most of where this renders.
  colors: { L: PURPLE, D: PURPLE_DARK, K: DARK, A: GLOW, W: BONE },
  label: 'bat',
}

type Props = {
  sprite: Sprite
  /** Rendered width in px. Height follows the grid's ratio. */
  size?: number
  className?: string
}

export default function PixelSprite({ sprite, size = 20, className }: Props) {
  const { grid, colors } = sprite
  const w = grid[0].length
  const h = grid.length

  const cells = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const fill = colors[grid[y][x]]
      if (!fill) continue
      cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />)
    }
  }

  return (
    <svg
      width={size}
      height={(size / w) * h}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {cells}
    </svg>
  )
}
