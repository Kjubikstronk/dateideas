import { memo, useEffect, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { averageStars, memoriesOf, type DateIdea } from '../types'
import { useAuth } from '../lib/auth'
import { FREEZING_C, HOT_C, SKY_EMOJI, type Forecast } from '../lib/weather'
import PixelHeart from './PixelHeart'
import { pinColor } from './DateMap'

type Props = {
  item: DateIdea
  onUpdate: (id: string, patch: Partial<DateIdea>) => void
  onDelete: (id: string) => void
  onEdit: (item: DateIdea) => void
  /** Jump to this date: select its day and fly the map to its pin. */
  onLocate?: (item: DateIdea) => void
  /** Only present for upcoming dates with a place, inside the forecast range. */
  forecast?: Forecast
  /** Hide the day line where the surrounding view already shows the date. */
  hideDay?: boolean
  /**
   * A row in a list rather than a card in its own right.
   *
   * Giving every entry a bordered, shadowed box meant nothing on screen was
   * louder than anything else. Rows in the agenda sit flat on the paper and
   * lift into a card only while you're actually working on one.
   */
  flat?: boolean
  /** Days until this one, shown only on the single soonest upcoming date. */
  countdown?: string | null
  active?: boolean
  onHover?: (id: string | null) => void
}

type Mode = 'idle' | 'calling-off' | 'deleting' | 'remembering'

function DateCard({
  item,
  onUpdate,
  onDelete,
  onEdit,
  onLocate,
  forecast,
  hideDay,
  flat,
  countdown,
  active,
  onHover,
}: Props) {
  const [mode, setMode] = useState<Mode>('idle')
  const [reason, setReason] = useState('')
  // Counter, not a boolean — a <dialog> can close itself without telling React.
  const [sheetReq, setSheetReq] = useState(0)
  const sheetRef = useRef<HTMLDialogElement>(null)
  const { user } = useAuth()
  const me = user?.uid ?? 'preview'
  const memories = memoriesOf(item)
  const mine = memories[me]
  const theirs = Object.entries(memories).filter(([uid]) => uid !== me)

  const [stars, setStars] = useState(mine?.stars ?? 0)
  const [memoryNote, setMemoryNote] = useState(mine?.note ?? '')

  /**
   * Re-seed the editor from whatever is actually stored, each time it opens.
   *
   * These were set once at mount, and this component is memoised and keyed by
   * id, so it survives every snapshot. Rate a date on your phone and the open
   * card on your laptop still held the old values — saving there wrote them
   * back over the newer rating.
   */
  useEffect(() => {
    if (mode !== 'remembering') return
    setStars(mine?.stars ?? 0)
    setMemoryNote(mine?.note ?? '')
    // Keyed on the stored memory, so a partner's write while the editor is
    // closed is picked up next time it opens.
  }, [mode, mine?.stars, mine?.note])

  const cancelled = item.status === 'cancelled'

  /**
   * Whose idea this was.
   *
   * Only ever shown for theirs. You already know what you added, so labelling
   * your own picks would put a line on every card to say nothing — and the
   * card had one line too many to begin with.
   */
  const theirPick = !!item.createdBy && item.createdBy !== me
  /** Flat in a list, raised while you're working on it. */
  const asRow = !!flat && mode === 'idle'

  /**
   * Has the day been and gone?
   *
   * You cannot have gone somewhere that hasn't happened yet, so "we went" has
   * no business existing on a date two weeks out. Same string comparison the
   * rest of the app uses — yyyy-MM-dd sorts correctly and can't drift by
   * timezone.
   */
  const isPast = item.scheduledFor
    ? item.scheduledFor < format(new Date(), 'yyyy-MM-dd')
    : false

  function remember() {
    // Stars alone or a note alone are both valid — don't demand both. Only
    // ever writes under your own uid, so it can't touch theirs.
    onUpdate(item.id, {
      status: 'done',
      memories: {
        ...memories,
        [me]: { note: memoryNote.trim(), stars, at: Date.now() },
      },
    })
    setMode('idle')
  }

  const sheetOpen = sheetReq > 0
  const closeSheet = () => setSheetReq(0)

  useEffect(() => {
    const el = sheetRef.current
    if (!el) return
    if (sheetOpen && !el.open) el.showModal()
    else if (!sheetOpen && el.open) el.close()
  }, [sheetReq, sheetOpen])

  /**
   * The one action worth a button of its own.
   *
   * Every card used to carry up to four equally-weighted buttons — edit, we
   * went, call it off, delete — so nothing read as the obvious next step and
   * the list became a wall of chrome. Only what the date is actually asking
   * for gets a button; the rest lives behind the overflow.
   */
  const primary =
    item.status === 'planned' && isPast
      ? { label: 'we went', run: () => setMode('remembering') }
      : item.status === 'done'
        ? {
            label: mine ? 'change yours' : 'how was it?',
            run: () => setMode('remembering'),
          }
        : null

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
      data-date-id={item.id}
      className={[
        'transition-transform duration-75',
        // A flat row lifts into a card the moment it's the thing you're
        // handling, so the raised treatment means "this one" rather than
        // "all of them". Padding is decided once here: emitting two competing
        // padding classes leaves the winner down to CSS source order, which
        // is not something the markup gets to control.
        asRow
          ? 'border-b border-[rgba(26,16,51,0.2)] last:border-b-0'
          : 'pixel-box-sm',
        asRow
          ? cancelled
            ? 'px-3 py-2'
            : 'px-3 py-2.5'
          : cancelled
            ? 'p-2'
            : 'p-3',
        active && 'translate-x-[-1px] translate-y-[-1px]',
        cancelled && 'bg-[var(--color-card)]/60',
      ]
        .filter(Boolean)
        .join(' ')}
      {...(onHover
        ? { onMouseEnter: () => onHover(item.id), onMouseLeave: () => onHover(null) }
        : {})}
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
              cancelled ? 'text-sm text-[var(--color-mute)] line-through' : '',
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

          {theirPick && (
            <span className="legend mt-1 block text-[var(--color-ink)]/60">
              their pick
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
              {countdown && !cancelled && (
                <span className="ml-2 text-[var(--color-deep)]">· {countdown}</span>
              )}
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

          {/* Forecast, but only where it changes what you'd do: a picnic in
              the rain is worth knowing about, a cinema trip isn't. */}
          {forecast && !cancelled && (
            <span className="legend mt-1.5 flex items-center gap-1.5">
              <span aria-hidden="true" className="text-sm leading-none">
                {SKY_EMOJI[forecast.sky]}
              </span>
              <span
                // Outline, never filled: hot pink and aqua already mean
                // "done" and "planned" on the status heart, and a filled
                // badge in the same colours blurred the two together. The
                // sky emoji stays the only colour-carrying element here.
                className={
                  forecast.high >= HOT_C
                    ? 'border-2 border-[var(--color-ink)] px-1 py-0.5 text-[var(--color-deep)]'
                    : forecast.high <= FREEZING_C
                      ? 'border-2 border-[var(--color-ink)] px-1 py-0.5 text-[var(--color-ink)]/70'
                      : 'text-[var(--color-ink)]/60'
                }
              >
                {forecast.high}°
              </span>
              {forecast.high >= HOT_C && (
                <span className="text-[var(--color-deep)]">bring water</span>
              )}
            </span>
          )}

          {/* What actually happened.
              Theirs stays hidden until you've said your piece — seeing five
              hearts before you vote is how you end up agreeing with them
              rather than with yourself. */}
          {(mine || theirs.length > 0) && (
            <span className="mt-2 block border-l-[3px] border-[var(--color-aqua)] pl-2">
              {mine ? (
                <>
                  <Verdict label="you" memory={mine} />
                  {theirs.map(([uid, m]) => (
                    <Verdict key={uid} label="them" memory={m} />
                  ))}
                  <Agreement item={item} />
                </>
              ) : (
                <span className="legend block text-[var(--color-ink)]/60">
                  they&rsquo;ve said theirs · rate it to see
                </span>
              )}
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
        <div className="mt-2 flex items-center gap-2">
          {primary && (
            <button
              type="button"
              className="pixel-btn pixel-btn-primary legend px-2 py-1"
              onClick={primary.run}
            >
              {primary.label}
            </button>
          )}
          <button
            type="button"
            aria-label="more actions"
            className="pixel-btn legend ml-auto flex h-12 w-12 items-center justify-center text-base leading-none"
            onClick={() => setSheetReq((n) => n + 1)}
          >
            &#8943;
          </button>
        </div>
      )}

      {/* Everything that isn't the primary action. Deliberately the same sheet
          the editor uses — a second instance with different rows, not a new
          pattern to learn. */}
      <dialog ref={sheetRef} className="sheet" onClose={closeSheet}>
        <div className="flex flex-col">
          <header className="flex items-center justify-between border-b-[3px] border-[var(--color-ink)] bg-[var(--color-paper)] px-3 py-2">
            <h2 className="truncate font-[family-name:var(--font-display)] text-base font-bold">
              {item.place ? item.place.name : item.title}
            </h2>
            <button type="button" className="pixel-btn legend px-2 py-1" onClick={closeSheet}>
              close
            </button>
          </header>

          <div className="safe-bottom flex flex-col p-3">
            <SheetRow
              onClick={() => {
                closeSheet()
                onEdit(item)
              }}
            >
              edit
            </SheetRow>

            {item.status === 'planned' && (
              <SheetRow
                onClick={() => {
                  closeSheet()
                  setMode('calling-off')
                }}
              >
                {isPast ? 'we didn’t go' : 'call it off'}
              </SheetRow>
            )}

            {cancelled && (
              <SheetRow
                onClick={() => {
                  closeSheet()
                  onUpdate(item.id, { status: 'planned', cancelReason: null })
                }}
              >
                back on
              </SheetRow>
            )}

            {item.status === 'done' && (
              <SheetRow
                onClick={() => {
                  closeSheet()
                  onUpdate(item.id, { status: 'planned' })
                }}
              >
                move back to planned
              </SheetRow>
            )}

            <SheetRow
              danger
              onClick={() => {
                closeSheet()
                setMode('deleting')
              }}
            >
              delete
            </SheetRow>
          </div>
        </div>
      </dialog>

      {mode === 'remembering' && (
        <div className="mt-3 space-y-2">
          <fieldset>
            <legend className="legend mb-1.5 text-[var(--color-ink)]/60">
              how was it? {theirs.length > 0 && !mine ? '(they’ve already voted)' : ''}
            </legend>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} out of 5`}
                  aria-pressed={stars === n}
                  // Tapping the star you already chose clears the rating,
                  // otherwise there's no way back to "didn't rate it".
                  onClick={() => setStars(stars === n ? 0 : n)}
                  className="p-1"
                >
                  <PixelHeart
                    size={20}
                    color="var(--color-hot)"
                    outline={n > stars}
                    bordered
                  />
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block space-y-1">
            <span className="legend text-[var(--color-ink)]/60">
              anything worth remembering?
            </span>
            <input
              className="pixel-input"
              value={memoryNote}
              onChange={(e) => setMemoryNote(e.target.value)}
              placeholder="you fell asleep in the second act"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') remember()
                if (e.key === 'Escape') setMode('idle')
              }}
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              className="pixel-btn pixel-btn-primary legend px-2 py-1"
              onClick={remember}
            >
              save it
            </button>
            <button
              type="button"
              className="pixel-btn legend px-2 py-1"
              onClick={() => {
                // From `mine`, not the deprecated `item.memory` — that field
                // is never written any more, so restoring from it silently
                // reset the editor to empty and the next save destroyed the
                // real rating.
                setStars(mine?.stars ?? 0)
                setMemoryNote(mine?.note ?? '')
                setMode('idle')
              }}
            >
              never mind
            </button>
          </div>
        </div>
      )}

      {mode === 'calling-off' && (
        <div className="mt-3 space-y-2">
          <label className="block space-y-1">
            <span className="legend text-[var(--color-ink)]/60">
              {isPast ? 'what happened? (optional)' : 'why? (you can leave this empty)'}
            </span>
            <input
              className="pixel-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="it rained"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') callOff()
                if (e.key === 'Escape') {
                  setReason('')
                  setMode('idle')
                }
              }}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="pixel-btn pixel-btn-primary legend px-2 py-1"
              onClick={callOff}
            >
              {isPast ? 'we didn’t go' : 'call it off'}
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

/** A full-width tap target in the overflow sheet. Never below 44px. */
function SheetRow({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex min-h-11 w-full items-center border-b border-[rgba(26,16,51,0.2)] px-1 text-left',
        'font-[family-name:var(--font-display)] text-base last:border-b-0',
        danger ? 'text-[var(--color-deep)]' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  )
}

function Verdict({ label, memory }: { label: string; memory: { note: string; stars: number } }) {
  return (
    <span className="mt-1 block first:mt-0">
      <span className="flex items-center gap-2">
        <span className="legend w-9 shrink-0 text-[var(--color-ink)]/60">{label}</span>
        {memory.stars > 0 ? (
          <Stars value={memory.stars} />
        ) : (
          <span className="legend text-[var(--color-ink)]/45">no score</span>
        )}
      </span>
      {memory.note && (
        <span className="prose mt-0.5 block pl-11 text-xs text-[var(--color-ink)]/75">
          {memory.note}
        </span>
      )}
    </span>
  )
}

/** The payoff for rating blind. */
function Agreement({ item }: { item: DateIdea }) {
  const scores = Object.values(memoriesOf(item))
    .map((m) => m.stars)
    .filter((n) => n > 0)
  if (scores.length < 2) return null

  const avg = averageStars(item)
  const spread = Math.max(...scores) - Math.min(...scores)
  const verdict =
    spread === 0 ? 'you agreed' : spread === 1 ? 'near enough' : 'you disagreed'

  return (
    <span className="legend mt-1.5 flex items-center gap-2">
      <span className="border-2 border-[var(--color-ink)] bg-[var(--color-hot)] px-1.5 py-1 text-[var(--color-ink)]">
        {avg?.toFixed(1)}
      </span>
      <span className="text-[var(--color-ink)]/60">{verdict}</span>
    </span>
  )
}

function Stars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <PixelHeart key={n} size={11} color="var(--color-hot)" outline={n > value} bordered />
      ))}
    </span>
  )
}

/**
 * Memoised: the agenda re-renders whenever anything in the app changes, and
 * without this every card rebuilt each time — including on scroll.
 */
export default memo(DateCard)
