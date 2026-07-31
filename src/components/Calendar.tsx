import { useEffect, useRef, useState } from 'react'
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import type { DateIdea } from '../types'
import PixelHeart from './PixelHeart'

const WEEKDAYS = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su']

/** Six full weeks, always. A grid that changes height between months makes the
    whole device jump, which reads as a bug rather than a month change. */
const WEEKS = 6

const key = (d: Date) => format(d, 'yyyy-MM-dd')

type Props = {
  month: Date
  onMonthChange: (next: Date) => void
  byDay: Map<string, DateIdea[]>
  selected: string | null
  onSelect: (day: string) => void
  /** Day currently hovered on the map, so the grid can answer back. */
  linkedDay?: string | null
  onHoverDay?: (day: string | null) => void
}

export default function Calendar({
  month,
  onMonthChange,
  byDay,
  selected,
  onSelect,
  linkedDay,
  onHoverDay,
}: Props) {
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const days = eachDayOfInterval({
    start: gridStart,
    end: addDays(gridStart, WEEKS * 7 - 1),
  })

  // Roving tabindex: the grid is one tab stop, arrows move within it. 42
  // separate tab stops per month would make keyboard use miserable.
  const [focusKey, setFocusKey] = useState<string>(() => key(new Date()))
  const cellRefs = useRef(new Map<string, HTMLButtonElement>())
  const shouldFocus = useRef(false)

  useEffect(() => {
    if (!shouldFocus.current) return
    shouldFocus.current = false
    cellRefs.current.get(focusKey)?.focus()
  }, [focusKey])

  function moveFocus(from: Date, deltaDays: number) {
    const next = addDays(from, deltaDays)
    shouldFocus.current = true
    setFocusKey(key(next))
    if (!isSameMonth(next, month)) onMonthChange(startOfMonth(next))
  }

  function onKeyDown(e: React.KeyboardEvent, day: Date) {
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    }
    if (e.key in moves) {
      e.preventDefault()
      moveFocus(day, moves[e.key])
    }
  }

  /**
   * Swipe left/right to change month.
   *
   * Deliberately fussy about what counts: a swipe must be both long enough and
   * clearly more horizontal than vertical, or scrolling the page with a slightly
   * angled thumb would flip the month by accident.
   */
  const swipe = useRef<{ x: number; y: number } | null>(null)

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    swipe.current = { x: t.clientX, y: t.clientY }
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = swipe.current
    swipe.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) < 60) return
    if (Math.abs(dx) < Math.abs(dy) * 1.5) return
    onMonthChange(addMonths(month, dx < 0 ? 1 : -1))
  }

  // Keep the roving focus inside the visible month when paging with the arrows.
  const focusInGrid = days.some((d) => key(d) === focusKey)
  const effectiveFocusKey = focusInGrid ? focusKey : key(startOfMonth(month))

  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between gap-2 px-2 py-2">
        <button
          type="button"
          className="pixel-btn px-3 py-1"
          onClick={() => onMonthChange(addMonths(month, -1))}
          aria-label="Previous month"
        >
          ◀
        </button>

        <span className="flex min-w-0 flex-col items-center">
          <h2 className="truncate font-[family-name:var(--font-display)] text-base font-bold sm:text-lg">
            {format(month, 'MMMM yyyy').toLowerCase()}
          </h2>
          {!isSameMonth(month, new Date()) && (
            <button
              type="button"
              className="legend mt-0.5 px-2 py-1 text-[var(--color-deep)] underline underline-offset-2"
              onClick={() => onMonthChange(startOfMonth(new Date()))}
            >
              back to today
            </button>
          )}
        </span>

        <button
          type="button"
          className="pixel-btn px-3 py-1"
          onClick={() => onMonthChange(addMonths(month, 1))}
          aria-label="Next month"
        >
          ▶
        </button>
      </header>

      <div className="grid grid-cols-7 gap-px px-1 sm:px-2">
        {WEEKDAYS.map((d) => (
          <div key={d} className="legend py-1 text-center text-[var(--color-ink)]/60">
            {d}
          </div>
        ))}
      </div>

      <div
        className="grid touch-pan-y grid-cols-7 gap-0.5 p-1 sm:gap-1 sm:p-2"
        role="grid"
        aria-label={format(month, 'MMMM yyyy')}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {days.map((day) => {
          const k = key(day)
          const entries = byDay.get(k) ?? []
          const outside = !isSameMonth(day, month)
          const today = isToday(day)
          const isSelected = selected === k
          const isLinked = linkedDay === k

          return (
            <button
              key={k}
              type="button"
              role="gridcell"
              ref={(el) => {
                if (el) cellRefs.current.set(k, el)
                else cellRefs.current.delete(k)
              }}
              tabIndex={k === effectiveFocusKey ? 0 : -1}
              onKeyDown={(e) => onKeyDown(e, day)}
              onFocus={() => setFocusKey(k)}
              onClick={() => onSelect(k)}
              onMouseEnter={() => onHoverDay?.(k)}
              onMouseLeave={() => onHoverDay?.(null)}
              aria-selected={isSelected}
              aria-label={`${format(day, 'EEEE d MMMM')}${
                entries.length ? `, ${entries.length} planned` : ''
              }`}
              className={[
                'relative flex aspect-square min-h-0 min-w-0 flex-col items-center justify-start gap-0.5 border-2 p-1 transition-transform duration-75',
                outside
                  ? 'border-transparent text-[var(--color-ink)]/60'
                  : 'border-[var(--color-ink)]',
                isSelected
                  ? 'bg-[var(--color-hot)] text-[var(--color-ink)]'
                  : isLinked
                    ? 'bg-[var(--color-lav)]'
                    : outside
                      ? ''
                      : 'bg-[var(--color-card)]',
                !outside && 'hover:-translate-y-0.5',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="font-[family-name:var(--font-display)] text-xs font-bold leading-none sm:text-sm">
                {format(day, 'd')}
              </span>

              {/* Status at a glance. Colour carries the meaning, but the
                  aria-label above carries it for screen readers too. */}
              {entries.length > 0 && (
                <span className="flex flex-wrap items-center justify-center gap-0.5">
                  {entries.slice(0, 3).map((entry) => (
                    <PixelHeart
                      key={entry.id}
                      size={8}
                      color={
                        entry.status === 'done'
                          ? 'var(--color-aqua)'
                          : isSelected
                            ? 'var(--color-ink)'
                            : 'var(--color-hot)'
                      }
                    />
                  ))}
                  {entries.length > 3 && (
                    <span className="legend text-[7px] leading-none">
                      +{entries.length - 3}
                    </span>
                  )}
                </span>
              )}

              {today && (
                <span
                  aria-hidden="true"
                  className="marquee-today absolute inset-x-0 bottom-0 h-[3px]"
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
