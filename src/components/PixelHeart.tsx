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

type Props = {
  /** Rendered size in px (width; height follows the glyph's ratio). */
  size?: number
  /** Any CSS colour — pass a token like `var(--color-hot)`. */
  color?: string
  /** Hollow outline instead of a solid fill, for "not yet planned". */
  outline?: boolean
  className?: string
}

export default function PixelHeart({
  size = 24,
  color = 'var(--color-hot)',
  outline = false,
  className,
}: Props) {
  const cells: React.ReactElement[] = []

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (HEART[y][x] !== 'X') continue

      // An outline heart keeps only pixels touching empty space, which
      // gives a 1px border that is still made of real pixels.
      if (outline) {
        const solid = (px: number, py: number) =>
          py >= 0 && py < H && px >= 0 && px < W && HEART[py][px] === 'X'
        const enclosed =
          solid(x - 1, y) && solid(x + 1, y) && solid(x, y - 1) && solid(x, y + 1)
        if (enclosed) continue
      }

      cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />)
    }
  }

  return (
    <svg
      width={size}
      height={(size / W) * H}
      viewBox={`0 0 ${W} ${H}`}
      fill={color}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {cells}
    </svg>
  )
}
