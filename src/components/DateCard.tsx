import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import type { DateIdea } from '../types'
import PixelHeart from './PixelHeart'
import { pinColor } from './DateMap'

type Props = {
  item: DateIdea
  onUpdate: (id: string, patch: Partial<DateIdea>) => void
  onDelete: (id: string) => void
  onEdit: (item: DateIdea) => void
  /** Jump to this date: select its day and fly the map to its pin. */
  onLocate?: (item: DateIdea) => void
  /** Hide the day line where the surrounding view already shows the date. */
  hideDay?: boolean
  active?: boolean
  onHover?: (id: string | null) => void
}

type Mode = 'idle' | 'calling-off' | 'deleting'

export default function DateCard({
  item,
  onUpdate,
  onDelete,
  onEdit,
  onLocate,
  hideDay,
  active,
  onHover,
}: Props) {
  const [mode, setMode] = useState<Mode>('idle')
  const [reason, setReason] = useState('')

  const cancelled = item.status === 'cancelled'

  function callOff() {
    onUpdate(item.id, {
      status: 'cancelled',
      cancelReason: reason.trim() || null,
    })
    setReason('')
    setMode('idle')
  }

  return (
    <li
      className={[
        'pixel-box-sm p-3 transition-transform duration-75',
        active && 'translate-x-[-1px] translate-y-[-1px]',
        cancelled && 'bg-[var(--color-card)]/60',
      ]
        .filter(Boolean)
        .join(' ')}
      onMouseEnter={() => onHover?.(item.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      {/* The whole header is the "take me there" target — bigger than any
          icon and the obvious thing to hit. */}
      <button
        type="button"
        onClick={() => onLocate?.(item)}
        className="flex w-full items-start gap-3 text-left"
      >
        <span
          aria-hidden="true"
          className={cancelled ? 'text-xl leading-none opacity-40' : 'text-xl leading-none'}
        >
          {item.emoji}
        </span>

        <span className="min-w-0 flex-1">
          {/* Lead with whatever identifies the date best. A place is the more
              memorable half when there is one ("Viper Room" beats "PARTY"),
              but plenty of dates have no place, and those must not look
              broken — so the title takes the top line instead. */}
          <span
            className={[
              'block font-[family-name:var(--font-display)] font-bold leading-tight',
              cancelled && 'text-[var(--color-mute)] line-through',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {item.place ? item.place.name : item.title}
          </span>

          {item.place ? (
            <span
              className={[
                'mt-0.5 block truncate text-sm',
                cancelled ? 'text-[var(--color-mute)]' : 'text-[var(--color-ink)]/70',
              ].join(' ')}
            >
              {item.title}
            </span>
          ) : (
            <span className="legend mt-1 block text-[var(--color-ink)]/60">
              no place yet
            </span>
          )}

          {item.scheduledFor && (hideDay ? item.time : true) && (
            <span
              className={
                cancelled
                  ? 'legend mt-1.5 block text-[var(--color-mute)]'
                  : 'legend mt-1.5 block text-[var(--color-deep)]'
              }
            >
              {hideDay
                ? item.time
                : `${format(parseISO(item.scheduledFor), 'EEE d MMM').toLowerCase()}${
                    item.time ? ` · ${item.time}` : ''
                  }`}
            </span>
          )}

          {item.note && !cancelled && (
            <span className="prose mt-1.5 block text-xs text-[var(--color-ink)]/70">
              {item.note}
            </span>
          )}

          {cancelled && (
            <span className="prose mt-1.5 block text-xs text-[var(--color-mute)]">
              called off{item.cancelReason ? ` — ${item.cancelReason}` : ''}
            </span>
          )}
        </span>

        <span className="shrink-0 pt-1">
          <PixelHeart
            size={14}
            color={pinColor(item.status)}
            outline={item.status === 'idea'}
            bordered
          />
        </span>
      </button>

      {/* Actions ------------------------------------------------------- */}

      {mode === 'idle' && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="pixel-btn legend px-2 py-1"
            onClick={() => onEdit(item)}
          >
            edit
          </button>

          {item.status === 'planned' && (
            <>
              <button
                type="button"
                className="pixel-btn legend px-2 py-1"
                onClick={() => onUpdate(item.id, { status: 'done' })}
              >
                we went
              </button>
              <button
                type="button"
                className="pixel-btn legend px-2 py-1"
                onClick={() => setMode('calling-off')}
              >
                call it off
              </button>
            </>
          )}

          {cancelled && (
            <button
              type="button"
              className="pixel-btn legend px-2 py-1"
              onClick={() =>
                onUpdate(item.id, { status: 'planned', cancelReason: null })
              }
            >
              back on
            </button>
          )}

          {item.status === 'done' && (
            <button
              type="button"
              className="pixel-btn legend px-2 py-1"
              onClick={() => onUpdate(item.id, { status: 'planned' })}
            >
              undo
            </button>
          )}

          <button
            type="button"
            className="pixel-btn legend ml-auto px-2 py-1 text-[var(--color-deep)]"
            onClick={() => setMode('deleting')}
          >
            delete
          </button>
        </div>
      )}

      {mode === 'calling-off' && (
        <div className="mt-3 space-y-2">
          <label className="block space-y-1">
            <span className="legend text-[var(--color-ink)]/60">
              why? (you can leave this empty)
            </span>
            <input
              className="pixel-input text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="it rained"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') callOff()
                if (e.key === 'Escape') setMode('idle')
              }}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="pixel-btn pixel-btn-primary legend px-2 py-1"
              onClick={callOff}
            >
              call it off
            </button>
            <button
              type="button"
              className="pixel-btn legend px-2 py-1"
              onClick={() => {
                setReason('')
                setMode('idle')
              }}
            >
              never mind
            </button>
          </div>
        </div>
      )}

      {/* Deleting can't be undone, so it asks once. Cancelling doesn't ask,
          because cancelling is reversible with "back on". */}
      {mode === 'deleting' && (
        <div className="mt-3 space-y-2">
          <p className="prose text-sm text-[var(--color-deep)]">
            Delete this for good? To just call it off instead, use “call it off”.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="pixel-btn legend bg-[var(--color-deep)] px-2 py-1 text-[var(--color-card)]"
              onClick={() => onDelete(item.id)}
            >
              yes, delete
            </button>
            <button
              type="button"
              className="pixel-btn legend px-2 py-1"
              onClick={() => setMode('idle')}
              autoFocus
            >
              never mind
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
