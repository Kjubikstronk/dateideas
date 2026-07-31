import { useMemo, useState } from 'react'
import { differenceInCalendarDays, format, parseISO, startOfMonth } from 'date-fns'
import Calendar from '../components/Calendar'
import DateCard from '../components/DateCard'
import DateMap from '../components/DateMap'
import EditSheet from '../components/EditSheet'
import MapsProvider from '../components/MapsProvider'
import PixelHeart from '../components/PixelHeart'
import { useAuth } from '../lib/auth'
import { useDates } from '../lib/dates'
import { useHasHover, useIsWide } from '../lib/useMediaQuery'
import type { DateIdea, Place } from '../types'

type View = 'calendar' | 'map' | 'ideas'

export default function Home() {
  const { items, byDay, loading, error, writeError, dismissWriteError, add, update, remove } =
    useDates()

  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useState<View>('calendar')
  const isWide = useIsWide()
  // Touchscreens fake mouseenter while you scroll; see useHasHover.
  const hasHover = useHasHover()

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
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; nonce: number } | null>(null)

  /**
   * Tapping a card takes you to the date: its day gets selected in the grid,
   * its pin lights up, and the map flies to it. On a phone the map is a
   * separate tab, so going there is the only way the flight is visible.
   */
  const locate = (item: DateIdea) => {
    setActiveId(item.id)
    if (item.scheduledFor) {
      setSelected(item.scheduledFor)
      setMonth(startOfMonth(parseISO(item.scheduledFor)))
    }
    if (item.place?.lat != null && item.place.lng != null) {
      setFlyTo({ lat: item.place.lat, lng: item.place.lng, nonce: Date.now() })
      if (!isWide) setView('map')
    }
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

  /**
   * The agenda: every record, grouped, so nothing can hide.
   *
   * A date needs a day to appear on the calendar and a place to appear on the
   * map — miss either and it was previously invisible. This list has no such
   * requirement, which makes it the one complete view of everything.
   */
  const agenda = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const upcoming: DateIdea[] = []
    const past: DateIdea[] = []
    const someday: DateIdea[] = []

    for (const it of items) {
      if (!it.scheduledFor) someday.push(it)
      else if (it.scheduledFor >= today && it.status !== 'done' && it.status !== 'cancelled')
        upcoming.push(it)
      else past.push(it)
    }

    const byDay = (a: DateIdea, b: DateIdea) =>
      (a.scheduledFor ?? '').localeCompare(b.scheduledFor ?? '')

    upcoming.sort(byDay)
    past.sort((a, b) => byDay(b, a)) // most recent first
    someday.sort((a, b) => b.createdAt - a.createdAt)

    // Rides along on the "next up" heading rather than taking a row of its own:
    // it's the question you open the app to answer, and it costs no layout.
    const soonest = upcoming[0]?.scheduledFor
    const days = soonest ? differenceInCalendarDays(parseISO(soonest), new Date()) : null
    const countdown =
      days === null ? null : days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`

    return { upcoming, past, someday, countdown }
  }, [items])

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
    <div className="flex min-h-0 flex-col overflow-y-auto pb-28">
      <Calendar
        month={month}
        onMonthChange={setMonth}
        byDay={byDay}
        selected={selected}
        onSelect={setSelected}
        linkedDay={linkedDay}
        onHoverDay={hasHover ? setActiveDay : undefined}
      />
      <div className="border-t-[3px] border-[var(--color-ink)]">
        <DayPanel
          day={selected}
          entries={dayEntries}
          onUpdate={update}
          onDelete={remove}
          onEdit={openEdit}
          onLocate={locate}
          activeId={activeId}
          onHover={hasHover ? setActiveId : undefined}
        />
      </div>
    </div>
  )

  const mapPane = (
    <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
      <DateMap
        items={items}
        activeId={activeId}
        activeDay={linkedDay}
        onActivate={setActiveId}
        onAddPlace={openFromPlace}
        flyTo={flyTo}
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
    <AgendaPane
      agenda={agenda}
      onUpdate={update}
      onDelete={remove}
      onEdit={openEdit}
      onLocate={locate}
      activeId={activeId}
      onHover={hasHover ? setActiveId : undefined}
    />
  )

  const body = isWide ? (
    // Wide: the shell is a two-screen console, everything visible and linked.
    <div className="flex min-h-0 flex-1">
      <div className="flex w-[24rem] shrink-0 flex-col border-r-[3px] border-[var(--color-ink)]">
        {calendarPane}
      </div>
      {mapPane}
      <div className="w-64 shrink-0 overflow-y-auto border-l-[3px] border-[var(--color-ink)] pb-28">
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
          <div className="min-h-0 flex-1 overflow-y-auto pb-28">{ideasPane}</div>
        )}
      </div>
      <TabBar view={view} onChange={setView} />
    </div>
  )

  return (
    <MapsProvider>
      <div className="relative flex min-h-0 flex-1 flex-col">
        {body}

        {/* A refused write used to just revert with no explanation. */}
        {writeError && (
          <div
            role="alert"
            className="absolute inset-x-3 top-3 z-40 flex items-start gap-2 border-[3px] border-[var(--color-ink)] bg-[var(--color-card)] p-3 shadow-[4px_4px_0_var(--color-ink)]"
          >
            <p className="flex-1 text-sm text-[var(--color-deep)]">{writeError}</p>
            <button
              type="button"
              className="pixel-btn legend shrink-0 px-2 py-1"
              onClick={dismissWriteError}
            >
              ok
            </button>
          </div>
        )}

        {/* Adding a date is the one thing you do most, so it gets a permanent
            thumb-reachable button rather than living behind a menu.

            Not on the phone's map tab though: that view already adds dates by
            tapping a place, and a floating button there covers both the locate
            control and the card. */}
        {(isWide || view !== 'map') && (
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
        )}

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
    ['ideas', 'all dates'],
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
            'pixel-btn legend min-h-12 py-2',
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
  onLocate: (item: DateIdea) => void
  activeId: string | null
  /** Absent on touch devices — see useHasHover. */
  onHover?: (id: string | null) => void
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
              onLocate={rest.onLocate}
              active={rest.activeId === entry.id}
              onHover={rest.onHover}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function AgendaPane({
  agenda,
  ...rest
}: ListProps & {
  agenda: {
    upcoming: DateIdea[]
    past: DateIdea[]
    someday: DateIdea[]
    countdown: string | null
  }
}) {
  const { upcoming, past, someday } = agenda
  const empty = !upcoming.length && !past.length && !someday.length

  if (empty) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <PixelHeart size={28} color="var(--color-lav)" outline />
        <p className="prose text-sm text-[var(--color-ink)]/60">
          Nothing yet. Add somewhere you both want to go.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5 p-3">
      <Section
        title="next up"
        badge={agenda.countdown}
        items={upcoming}
        empty="Nothing planned. Pick a day for one of your ideas."
        {...rest}
      />
      <Section
        title="someday"
        items={someday}
        empty="No loose ideas right now."
        hint="no day picked yet"
        {...rest}
      />
      <Section title="been there" items={past} {...rest} />

      <SignOut />
    </div>
  )
}

/**
 * Signing out lives at the bottom of the list rather than in the header.
 * You'd almost never use it — the session persists deliberately — so it
 * shouldn't compete for space on a 375px status bar. But it has to exist for
 * the times you hand someone your phone.
 */
function SignOut() {
  const { user, leave } = useAuth()
  if (!user) return null

  return (
    <div className="border-t-[3px] border-[var(--color-ink)] pt-4">
      <p className="legend mb-2 text-[var(--color-ink)]/60">
        signed in as {user.email}
      </p>
      <button
        type="button"
        onClick={() => void leave()}
        className="pixel-btn legend px-3 py-1"
      >
        leave
      </button>
    </div>
  )
}

function Section({
  title,
  items,
  empty,
  hint,
  badge,
  ...rest
}: ListProps & {
  title: string
  items: DateIdea[]
  empty?: string
  hint?: string
  badge?: string | null
}) {
  // A section with nothing in it and nothing to say is just noise.
  if (!items.length && !empty) return null

  return (
    <section className="space-y-2">
      <h3 className="flex items-baseline gap-2">
        <span className="font-[family-name:var(--font-display)] text-lg font-bold">
          {title}
        </span>
        {badge ? (
          <span className="legend border-2 border-[var(--color-ink)] bg-[var(--color-hot)] px-1.5 py-1 text-[var(--color-ink)]">
            {badge}
          </span>
        ) : (
          items.length > 0 && (
            <span className="legend text-[var(--color-ink)]/60">{items.length}</span>
          )
        )}
      </h3>

      {hint && items.length > 0 && (
        <p className="legend text-[var(--color-ink)]/60">{hint}</p>
      )}

      {items.length === 0 ? (
        <p className="prose text-sm text-[var(--color-ink)]/60">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <DateCard
              key={item.id}
              item={item}
              onUpdate={rest.onUpdate}
              onDelete={rest.onDelete}
              onEdit={rest.onEdit}
              onLocate={rest.onLocate}
              active={rest.activeId === item.id}
              onHover={rest.onHover}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
