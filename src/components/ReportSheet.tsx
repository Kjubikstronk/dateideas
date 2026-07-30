import { useEffect, useRef, useState } from 'react'
import { captureContext, useReports, type Report } from '../lib/reports'

type Props = {
  /** Counter, not a boolean — see the note on EditSheet's `openRequest`. */
  openRequest: number
  onClose: () => void
}

const KINDS: [Report['kind'], string][] = [
  ['bug', 'something broke'],
  ['idea', 'wouldn’t it be nice'],
]

export default function ReportSheet({ openRequest, onClose }: Props) {
  const open = openRequest > 0
  const ref = useRef<HTMLDialogElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const { items, send, setDone, remove } = useReports()
  const [kind, setKind] = useState<Report['kind']>('bug')
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!open) return
    setKind('bug')
    setText('')
    setSent(false)
    setFailed(false)
  }, [openRequest, open])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open) {
      if (!el.open) el.showModal()
      textRef.current?.focus()
    } else if (el.open) {
      el.close()
    }
  }, [openRequest, open])

  const openReports = items.filter((r) => !r.done)
  const doneReports = items.filter((r) => r.done)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    try {
      await send(kind, text)
      setText('')
      setSent(true)
      setFailed(false)
    } catch {
      // Almost always means the `reports` rules haven't been published yet.
      // Failing visibly beats a form that appears to do nothing.
      setFailed(true)
      setSent(false)
    }
  }

  return (
    <dialog ref={ref} className="sheet" onClose={onClose}>
      <div className="flex max-h-[88svh] flex-col">
        <header className="flex items-center justify-between border-b-[3px] border-[var(--color-ink)] bg-[var(--color-paper)] px-3 py-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
            broken? or an idea?
          </h2>
          <button type="button" className="pixel-btn legend px-2 py-1" onClick={onClose}>
            close
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <form onSubmit={submit} className="space-y-3 border-b-[3px] border-[var(--color-ink)] p-3">
            <fieldset>
              <legend className="legend mb-1.5">what kind</legend>
              <div className="grid grid-cols-2 gap-2">
                {KINDS.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setKind(id)}
                    aria-pressed={kind === id}
                    className={[
                      'pixel-btn px-2 py-2 text-xs',
                      kind === id ? 'pixel-btn-primary' : '',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block space-y-1.5">
              <span className="legend">tell us</span>
              <textarea
                ref={textRef}
                className="pixel-input min-h-24"
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  setSent(false)
                  setFailed(false)
                }}
                placeholder={
                  kind === 'bug'
                    ? 'the map went blank when I tapped a pin'
                    : 'let us add photos after we go'
                }
                rows={3}
              />
            </label>

            {/* Say what's attached rather than collecting it silently. */}
            <details className="pixel-box-sm p-2">
              <summary className="legend cursor-pointer">what gets sent with it</summary>
              <ul className="prose mt-2 space-y-0.5 text-xs text-[var(--color-ink)]/70">
                <li>screen: {captureContext().screen}</li>
                <li>where you are: {captureContext().view}</li>
                <li>your phone or browser</li>
                <li>the time</li>
              </ul>
            </details>

            <div aria-live="polite">
              {sent && (
                <p className="pixel-box-sm bg-[var(--color-aqua)] px-3 py-2 text-sm">
                  Sent. It shows up for both of you below.
                </p>
              )}
              {failed && (
                <p className="pixel-box-sm px-3 py-2 text-sm text-[var(--color-deep)]">
                  Couldn&rsquo;t save that. The database is refusing reports —
                  the rules for them may not be published yet.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="pixel-btn pixel-btn-primary w-full px-4 py-2"
              disabled={!text.trim()}
            >
              send it
            </button>
          </form>

          <div className="space-y-4 p-3">
            <ReportList
              title="open"
              reports={openReports}
              empty="Nothing reported. Suspiciously good."
              onDone={(id) => setDone(id, true)}
              onRemove={remove}
            />
            {doneReports.length > 0 && (
              <ReportList
                title="sorted"
                reports={doneReports}
                onDone={(id) => setDone(id, false)}
                onRemove={remove}
              />
            )}
          </div>
        </div>
      </div>
    </dialog>
  )
}

function ReportList({
  title,
  reports,
  empty,
  onDone,
  onRemove,
}: {
  title: string
  reports: Report[]
  empty?: string
  onDone: (id: string) => void
  onRemove: (id: string) => void
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-baseline gap-2">
        <span className="font-[family-name:var(--font-display)] font-bold">{title}</span>
        {reports.length > 0 && (
          <span className="legend text-[var(--color-ink)]/60">{reports.length}</span>
        )}
      </h3>

      {reports.length === 0 ? (
        <p className="prose text-sm text-[var(--color-ink)]/60">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => (
            <li key={r.id} className="pixel-box-sm space-y-2 p-2">
              <p className="flex items-start gap-2">
                <span className="legend shrink-0 border-2 border-[var(--color-ink)] px-1.5 py-1">
                  {r.kind === 'bug' ? 'broke' : 'idea'}
                </span>
                <span className={r.done ? 'text-sm text-[var(--color-mute)] line-through' : 'text-sm'}>
                  {r.text}
                </span>
              </p>

              <p className="legend text-[var(--color-ink)]/60">
                {r.context.view} · {r.context.screen} ·{' '}
                {new Date(r.createdAt).toLocaleDateString()}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="pixel-btn legend px-2 py-1"
                  onClick={() => onDone(r.id)}
                >
                  {r.done ? 'reopen' : 'sorted'}
                </button>
                <button
                  type="button"
                  className="pixel-btn legend ml-auto px-2 py-1 text-[var(--color-deep)]"
                  onClick={() => onRemove(r.id)}
                >
                  bin it
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
