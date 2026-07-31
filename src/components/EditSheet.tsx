import { useEffect, useRef, useState } from 'react'
import PlacePicker from './PlacePicker'
import type { DateDraft, DateIdea, Place } from '../types'

/** Enough to label a date at a glance without opening an emoji keyboard. */
const EMOJI = [
  '🍜', '🍕', '☕', '🍦', '🍷', '🎬',
  '🎡', '🎨', '🎮', '🎳', '🛼', '⛸️',
  '🌿', '🏖️', '🌇', '🧺',
]

type Props = {
  /**
   * A counter that increments on every request to open, rather than a boolean.
   *
   * A <dialog> can close itself — Escape, or the browser's own UI — without
   * telling React. With a boolean, that desync is permanent: state still says
   * `open`, so the next "open" is a no-op and the sheet never comes back. A
   * counter makes every request a distinct event, so reopening always works
   * even if the close went unnoticed. Zero means closed.
   */
  openRequest: number
  /** Existing record to edit, or null to create. */
  editing: DateIdea | null
  /** Pre-selected day when adding from a calendar cell. */
  defaultDay?: string | null
  /** Pre-filled place when adding from the map. */
  defaultPlace?: Place | null
  onClose: () => void
  onSave: (draft: DateDraft) => void
}

export default function EditSheet({
  openRequest,
  editing,
  defaultDay,
  defaultPlace,
  onClose,
  onSave,
}: Props) {
  const open = openRequest > 0
  const ref = useRef<HTMLDialogElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  const [emoji, setEmoji] = useState('🍜')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [place, setPlace] = useState<Place | null>(null)
  const [day, setDay] = useState('')
  const [time, setTime] = useState('')
  const [saving, setSaving] = useState(false)
  // A ref, not the state above: state updates on the next render, so three
  // taps in one tick would all read `saving === false` and each save a copy.
  const savingRef = useRef(false)

  // Reset the form whenever the sheet opens, so a cancelled edit never leaks
  // into the next one.
  useEffect(() => {
    if (!open) return
    setEmoji(editing?.emoji ?? '🍜')
    setTitle(editing?.title ?? '')
    setNote(editing?.note ?? '')
    setPlace(editing?.place ?? defaultPlace ?? null)
    setDay(editing?.scheduledFor ?? defaultDay ?? '')
    setTime(editing?.time ?? '')
    setSaving(false)
    savingRef.current = false
    // Keyed on openRequest so reopening always starts from a clean form.
  }, [openRequest, open, editing, defaultDay, defaultPlace])

  // <dialog> needs imperative open/close to get the backdrop and focus trap.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open) {
      // `!el.open` guards against calling showModal() on an already-open
      // dialog, which throws.
      if (!el.open) el.showModal()
      // React's `autoFocus` runs at mount, but the dialog only opens later in
      // this effect — so showModal() would otherwise park focus on the first
      // control in the DOM, which is "close". Put it where typing starts.
      titleRef.current?.focus()
    } else if (el.open) {
      el.close()
    }
  }, [openRequest, open])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    // A double tap on a phone is easy, and onSave isn't awaited — without this
    // guard the second tap created a duplicate date.
    if (!title.trim() || savingRef.current) return
    savingRef.current = true
    setSaving(true)

    // Scheduling is what promotes a wish into a plan. An existing `done` or
    // `cancelled` record keeps its status — re-saving shouldn't rewrite history.
    const status: DateIdea['status'] = !day
      ? 'idea'
      : editing && editing.status !== 'idea'
        ? editing.status
        : 'planned'

    onSave({
      title: title.trim(),
      note: note.trim(),
      emoji,
      place,
      scheduledFor: day || null,
      time: day && time ? time : null,
      status,
      cancelReason: editing?.cancelReason ?? null,
      memories: editing?.memories ?? null,
    })
    onClose()
  }

  return (
    <dialog ref={ref} className="sheet" onClose={onClose}>
      <form onSubmit={submit} className="flex max-h-[88svh] flex-col">
        <header className="flex items-center justify-between border-b-[3px] border-[var(--color-ink)] bg-[var(--color-paper)] px-3 py-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
            {editing ? 'edit' : 'new date'}
          </h2>
          <button
            type="button"
            className="pixel-btn legend px-2 py-1"
            onClick={onClose}
          >
            close
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
          <label className="block space-y-1.5">
            <span className="legend">what</span>
            <input
              ref={titleRef}
              className="pixel-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ramen, then the arcade"
              required
            />
          </label>

          <fieldset className="space-y-1.5">
            <legend className="legend mb-1.5">sticker</legend>
            <div className="grid grid-cols-8 gap-1">
              {EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  aria-label={e}
                  aria-pressed={emoji === e}
                  className={[
                    'pixel-btn flex items-center justify-center p-0 text-lg',
                    emoji === e ? 'pixel-btn-primary' : '',
                  ].join(' ')}
                >
                  {e}
                </button>
              ))}
            </div>
          </fieldset>

          <PlacePicker value={place} onChange={setPlace} />

          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1.5">
              <span className="legend">day</span>
              {/* Native pickers, deliberately — the OS date wheel on a phone
                  beats anything hand-built, and it's what people know. */}
              <input
                type="date"
                className="pixel-input"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="legend">time</span>
              <input
                type="time"
                className="pixel-input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={!day}
              />
            </label>
          </div>

          {!day && (
            <p className="legend text-[var(--color-ink)]/60">
              leave the day empty to keep it on the someday list
            </p>
          )}

          <label className="block space-y-1.5">
            <span className="legend">notes</span>
            <textarea
              className="pixel-input min-h-20"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="go early, it fills up"
              rows={3}
            />
          </label>
        </div>

        {/* Actions pinned to the bottom edge: on a phone this is where your
            thumb already is, and it survives the keyboard opening. */}
        <footer className="safe-bottom flex gap-2 border-t-[3px] border-[var(--color-ink)] bg-[var(--color-paper)] p-3">
          <button
            type="submit"
            className="pixel-btn pixel-btn-primary flex-1 px-4 py-2"
            disabled={!title.trim() || saving}
          >
            {editing ? 'save' : 'add it'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}
