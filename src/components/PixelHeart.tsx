/**
 * The app's one recurring glyph — page mark, map pin, empty-state icon.
 * Drawn as literal pixels rather than a smooth path so it stays honest at
 * any size: scaling it up gives you bigger squares, not a vector curve.
 */

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

const W = HEART[0].length
const H = HEART.length

const filled = (x: number, y: number) =>
  y >= 0 && y < H && x >= 0 && x < W && HEART[y][x] === 'X'

/** True for a filled pixel touching empty space — the glyph's own edge. */
const isEdge = (x: number, y: number) =>
  !(filled(x - 1, y) && filled(x + 1, y) && filled(x, y - 1) && filled(x, y + 1))

type Props = {
  /** Rendered size in px (width; height follows the glyph's ratio). */
  size?: number
  /** Any CSS colour — pass a token like `var(--color-hot)`. */
  color?: string
  /** Hollow centre, for "wanted but not planned". */
  outline?: boolean
  /**
   * Draw a one-pixel ink halo around the glyph.
   *
   * Map pins need this: a pale heart on a pale map is invisible, and the
   * lavender "someday" one was effectively gone. The halo also matches the
   * ink borders used everywhere else in the design. Off by default because
   * at 8px — the calendar markers — it would eat the glyph.
   */
  bordered?: boolean
  className?: string
}

export default function PixelHeart({
  size = 24,
  color = 'var(--color-hot)',
  outline = false,
  bordered = false,
  className,
}: Props) {
  // A halo needs a one-pixel margin all round, so the viewBox grows with it.
  const pad = bordered ? 1 : 0
  const vw = W + pad * 2
  const vh = H + pad * 2

  const cells: React.ReactElement[] = []
  const px = (x: number, y: number, fill: string) =>
    cells.push(
      <rect key={`${fill}-${x}-${y}`} x={x + pad} y={y + pad} width={1} height={1} fill={fill} />,
    )

  if (bordered) {
    // Every empty pixel touching the glyph, including diagonally, so the halo
    // closes around corners instead of leaving gaps.
    for (let y = -1; y <= H; y++) {
      for (let x = -1; x <= W; x++) {
        if (filled(x, y)) continue
        let touches = false
        for (let dy = -1; dy <= 1 && !touches; dy++) {
          for (let dx = -1; dx <= 1 && !touches; dx++) {
            if (filled(x + dx, y + dy)) touches = true
          }
        }
        if (touches) px(x, y, 'var(--color-ink)')
      }
    }
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!filled(x, y)) continue
      if (outline) {
        // Keep the shape readable while still reading as "not yet a plan":
        // coloured ring, pale centre — rather than nothing at all.
        px(x, y, isEdge(x, y) ? color : 'var(--color-card)')
      } else {
        px(x, y, color)
      }
    }
  }

  return (
    <svg
      width={size}
      height={(size / vw) * vh}
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
