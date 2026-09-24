import type { CSSProperties } from 'react'
import PixelSprite, { BAT_DOWN, BAT_UP, MOON, pixelCells } from './PixelSprite'

/**
 * A night sky behind the season greeting: a moon, and a few bats crossing it.
 *
 * Ambience, not a jumpscare. Everything is already mid-flight when the window
 * opens (negative delays), nothing flies at the viewer, and the far bats are
 * smaller and dimmer so the layer reads as depth rather than a swarm.
 *
 * All motion is `steps()` — the flight path moves in visible hops, like a
 * sprite on a handheld — and it is pure CSS, because nothing here may lean on
 * requestAnimationFrame.
 */

type Bat = {
  /** Height in the sky, as % of the viewport. */
  y: number
  size: number
  /** Seconds per crossing. */
  dur: number
  /** Negative: how far into its crossing it already is on open. */
  delay: number
  reverse?: boolean
  far?: boolean
}

const BATS: Bat[] = [
  { y: 8, size: 36, dur: 11, delay: -3 },
  { y: 20, size: 18, dur: 16, delay: -9, reverse: true, far: true },
  { y: 33, size: 28, dur: 13, delay: -1, reverse: true },
  { y: 14, size: 14, dur: 19, delay: -14, far: true },
  { y: 44, size: 20, dur: 15, delay: -7, far: true },
  { y: 5, size: 16, dur: 21, delay: -17, reverse: true, far: true },
]

function FlappingBat({ size }: { size: number }) {
  const w = BAT_UP.grid[0].length
  const h = BAT_UP.grid.length
  return (
    <svg
      width={size}
      height={(size / w) * h}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <g className="bat-frame-a">{pixelCells(BAT_UP, 'u')}</g>
      <g className="bat-frame-b">{pixelCells(BAT_DOWN, 'd')}</g>
    </svg>
  )
}

export default function BatSky() {
  return (
    <div aria-hidden="true" className="bat-sky">
      <PixelSprite sprite={MOON} size={72} className="bat-moon" />
      {BATS.map((b, i) => (
        <span
          key={i}
          className={['bat', b.reverse ? 'bat-reverse' : '', b.far ? 'bat-far' : '']
            .filter(Boolean)
            .join(' ')}
          style={
            {
              top: `${b.y}%`,
              animationDuration: `${b.dur}s`,
              animationDelay: `${b.delay}s`,
              // Where it rests when motion is reduced: scattered, not stacked.
              '--bat-rest': `${10 + ((i * 29) % 80)}vw`,
              '--flap': `${260 + ((i * 47) % 140)}ms`,
            } as CSSProperties
          }
        >
          <FlappingBat size={b.size} />
        </span>
      ))}
    </div>
  )
}
