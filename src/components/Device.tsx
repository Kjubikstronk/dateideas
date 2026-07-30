import type { ReactNode } from 'react'
import PixelHeart from './PixelHeart'

/**
 * The signature shell. Everything in the app is rendered *inside a gadget* —
 * a moulded bezel with a recessed screen — rather than on a page.
 *
 * On a phone the metaphor is literal: the device fills the viewport and you
 * are holding it. On desktop the shell widens and the screen area splits in
 * two, which is what earns the side-by-side calendar/map layout instead of it
 * being an arbitrary desktop concession.
 */

type Props = {
  children: ReactNode
  /** Right-hand side of the status bar — countdown, sign-out, etc. */
  status?: ReactNode
}

export default function Device({ children, status }: Props) {
  return (
    <div className="safe-frame flex h-[100svh] flex-col overflow-hidden sm:p-6 lg:p-8">
      <div className="device boot mx-auto flex w-full min-h-0 max-w-6xl flex-1 flex-col overflow-hidden">
        {/* Status bar — the printed legend across the top of the case. */}
        <header className="flex items-center justify-between gap-3 px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <PixelHeart size={18} color="var(--color-ink)" className="beat" />
            <h1 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-wide text-[var(--color-ink)] sm:text-xl">
              our dates
            </h1>
          </div>
          {status ? <div className="flex items-center gap-2">{status}</div> : null}
        </header>

        {/* The recessed display. */}
        <div className="screen m-2 mt-0 flex min-h-0 flex-1 flex-col overflow-hidden sm:m-3 sm:mt-0">
          {children}
        </div>
      </div>
    </div>
  )
}
