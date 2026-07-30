import { useMemo, useState } from 'react'
import { format, parseISO, startOfMonth } from 'date-fns'
import Calendar from '../components/Calendar'
import DateCard from '../components/DateCard'
import DateMap from '../components/DateMap'
import EditSheet from '../components/EditSheet'
import MapsProvider from '../components/MapsProvider'
import PixelHeart from '../components/PixelHeart'
import { useDates } from '../lib/dates'
import { useIsWide } from '../lib/useMediaQuery'
import type { DateIdea, Place } from '../types'

type View = 'calendar' | 'map' | 'ideas'

export default function Home() {
  const { items, byDay, ideas, loading, error, add, update, remove } = useDates()

  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useState<View>('calendar')
  const isWide = useIsWide()

  // A counter, not a boolean — see the note on EditSheet's `openRequest`.
  const [openReq, setOpenReq] = useState(0)
  const [editing, setEditing] = useState<DateIdea | null>(null)
  const [seedPlace, setSeedPlace] = useState<Place | null>(null)

  const openNew = () => {
    setEditing(null)
    setSeedPlace(null)
    setOpenReq((n) => n + 1)
  }
  const openEdit = (item: DateIdea) => {
    setEditing(item)
    setSeedPlace(null)
    setOpenReq((n) => n + 1)
  }
  /** Map-first flow: found somewhere, start a date from it. */
  const openFromPlace = (place: Place) => {
    setEditing(null)
    setSeedPlace(place)
    setOpenReq((n) => n + 1)
  }

  /** The one record under the pointer, wherever the pointer is. */
  const [activeId, setActiveId] = useState<string | null>(null)
  /** A whole day under the pointer, from the calendar grid. */
  const [activeDay, setActiveDay] = useState<string | null>(null)

  // Hovering a card or pin should light its day in the grid, and hovering a
  // day should light its pins. Deriving one from the other here keeps the two
  // views in step without either knowing about the other.
  const linkedDay = useMemo(
    () => activeDay ?? items.find((i) => i.id === activeId)?.scheduledFor ?? null,
    [activeDay, activeId, items],
  )

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="pixel-box-sm max-w-xs px-3 py-2 text-center text-sm text-[var(--color-deep)]">
          {error}
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <PixelHeart size={32} color="var(--color-lav)" className="beat" />
        <p className="legend text-[var(--color-ink)]/60">loading your dates</p>
      </div>
    )
  }

  const dayEntries = selected ? (byDay.get(selected) ?? []) : []

  const calendarPane = (
    <div className="flex min-h-0 flex-col overflow-y-auto">
      <Calendar
        month={month}
        onMonthChange={setMonth}
        byDay={byDay}
        selected={selected}
        onSelect={setSelected}
        linkedDay={linkedDay}
        onHoverDay={setActiveDay}
      />
      <div className="border-t-[3px] border-[var(--color-ink)]">
        <DayPanel
          day={selected}
          entries={dayEntries}
          onUpdate={update}
          onDelete={remove}
          onEdit={openEdit}
          activeId={activeId}
          onHover={setActiveId}
        />
      </div>
    </div>
  )

  const mapPane = (
    <div className="relative min-h-0 flex-1">
      <DateMap
        items={items}
        activeId={activeId}
        activeDay={linkedDay}
        onActivate={setActiveId}
        onAddPlace={openFromPlace}
        onOpen={(id) => {
          // Tapping a pin on a phone jumps to the day it belongs to.
          const item = items.find((i) => i.id === id)
          if (item?.scheduledFor) {
            setSelected(item.scheduledFor)
            setMonth(startOfMonth(parseISO(item.scheduledFor)))
          }
        }}
      />
    </div>
  )

  const ideasPane = (
    <IdeasPane
      ideas={ideas}
      onUpdate={update}
      onDelete={remove}
      onEdit={openEdit}
      activeId={activeId}
      onHover={setActiveId}
    />
  )

  const body = isWide ? (
    // Wide: the shell is a two-screen console, everything visible and linked.
    <div className="flex min-h-0 flex-1">
      <div className="flex w-[26rem] shrink-0 flex-col border-r-[3px] border-[var(--color-ink)]">
        {calendarPane}
      </div>
      {mapPane}
      <div className="w-72 shrink-0 overflow-y-auto border-l-[3px] border-[var(--color-ink)]">
        {ideasPane}
      </div>
    </div>
  ) : (
    // Narrow: one screen at a time. A split view at 375px is unusable, and the
    // map in particular needs the full width to be worth having.
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {view === 'calendar' && calendarPane}
        {view === 'map' && mapPane}
        {view === 'ideas' && (
          <div className="min-h-0 flex-1 overflow-y-auto">{ideasPane}</div>
        )}
      </div>
      <TabBar view={view} onChange={setView} />
    </div>
  )

  return (
    <MapsProvider>
      <div className="relative flex min-h-0 flex-1 flex-col">
        {body}

        {/* Adding a date is the one thing you do most, so it gets a permanent
            thumb-reachable button rather than living behind a menu. It clears
            the tab bar on narrow screens. */}
        <button
          type="button"
          onClick={openNew}
          className={[
            'pixel-btn pixel-btn-primary absolute right-3 z-20 px-4 py-3',
            'font-[family-name:var(--font-display)] text-base',
            isWide ? 'bottom-3' : 'bottom-20',
          ].join(' ')}
        >
          + new date
        </button>

        <EditSheet
          openRequest={openReq}
          editing={editing}
          defaultDay={selected}
          defaultPlace={seedPlace}
          onClose={() => setOpenReq(0)}
          onSave={(draft) => {
            if (editing) update(editing.id, draft)
            else add(draft)
          }}
        />
      </div>
    </MapsProvider>
  )
}

/** The device's buttons. Mobile only. */
function TabBar({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const tabs: [View, string][] = [
    ['calendar', 'calendar'],
    ['map', 'map'],
    ['ideas', 'someday'],
  ]

  return (
    <nav className="safe-bottom grid shrink-0 grid-cols-3 gap-1 border-t-[3px] border-[var(--color-ink)] bg-[var(--color-paper)] p-1">
      {tabs.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-current={view === id ? 'page' : undefined}
          className={[
            'pixel-btn legend py-2',
            view === id ? 'pixel-btn-primary' : '',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </nav>
  )
}

type ListProps = {
  onUpdate: (id: string, patch: Partial<DateIdea>) => void
  onDelete: (id: string) => void
  onEdit: (item: DateIdea) => void
  activeId: string | null
  onHover: (id: string | null) => void
}

function DayPanel({
  day,
  entries,
  ...rest
}: ListProps & { day: string | null; entries: DateIdea[] }) {
  if (!day) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <PixelHeart size={28} color="var(--color-lav)" outline />
        <p className="prose max-w-[18rem] text-sm text-[var(--color-ink)]/60">
          Pick a day to see what&rsquo;s on it.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-3">
      <h3 className="font-[family-name:var(--font-display)] text-lg font-bold">
        {format(parseISO(day), 'EEEE d MMMM').toLowerCase()}
      </h3>

      {entries.length === 0 ? (
        <p className="prose text-sm text-[var(--color-ink)]/60">Nothing here yet.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <DateCard
              key={entry.id}
              item={entry}
              hideDay
              onUpdate={rest.onUpdate}
              onDelete={rest.onDelete}
              onEdit={rest.onEdit}
              active={rest.activeId === entry.id}
              onHover={rest.onHover}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function IdeasPane({ ideas, ...rest }: ListProps & { ideas: DateIdea[] }) {
  return (
    <div className="space-y-3 p-3">
      <h3 className="font-[family-name:var(--font-display)] text-lg font-bold">
        someday
      </h3>

      {ideas.length === 0 ? (
        <p className="prose text-sm text-[var(--color-ink)]/60">
          Nothing on the wishlist. Add somewhere you both want to go.
        </p>
      ) : (
        <ul className="space-y-2">
          {ideas.map((idea) => (
            <DateCard
              key={idea.id}
              item={idea}
              onUpdate={rest.onUpdate}
              onDelete={rest.onDelete}
              onEdit={rest.onEdit}
              active={rest.activeId === idea.id}
              onHover={rest.onHover}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
