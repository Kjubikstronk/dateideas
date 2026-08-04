import { useMemo, useState } from 'react'
import { differenceInCalendarDays, format, parseISO, startOfMonth } from 'date-fns'
import Calendar from '../components/Calendar'
import DateCard from '../components/DateCard'
import DateMap from '../components/DateMap'
import EditSheet from '../components/EditSheet'
import MapsProvider from '../components/MapsProvider'
import PixelHeart from '../components/PixelHeart'
import { pinColor } from '../components/DateMap'
import { useAuth } from '../lib/auth'
import { useDates } from '../lib/dates'
import { useWeather } from '../lib/weather'
import { useHasHover, useIsWide } from '../lib/useMediaQuery'
import { memoriesOf, type DateIdea, type Place } from '../types'

type View = 'calendar' | 'map' | 'ideas'

export default function Home() {
  const {
    membership,
    items,
    byDay,
    loading,
    error,
    writeError,
    dismissWriteError,
    add,
    update,
    remove,
  } = useDates()

  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useState<View>('calendar')
  const isWide = useIsWide()
  // Touchscreens fake mouseenter while you scroll; see useHasHover.
  const hasHover = useHasHover()
  const { user } = useAuth()
  const me = user?.uid ?? 'preview'
  const weather = useWeather(items)

  /**
   * A quiet lifetime stat for the desktop strip.
   *
   * Both halves come from data already in memory — no extra field, no extra
   * read. It stays hidden until there's something to say, so a new couple
   * isn't greeted by "0 dates".
   */
  const milestone = useMemo(() => {
    const been = items.filter((i) => i.status === 'done').length
    if (!been) return null
    const first = Math.min(...items.map((i) => i.createdAt))
    return `${been} ${been === 1 ? 'date' : 'dates'} · since ${format(new Date(first), 'MMM yyyy').toLowerCase()}`
  }, [items])

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
    const unanswered: DateIdea[] = []
    const upcoming: DateIdea[] = []
    const past: DateIdea[] = []
    const someday: DateIdea[] = []

    for (const it of items) {
      if (!it.scheduledFor) {
        someday.push(it)
        continue
      }

      const gone = it.scheduledFor <= today

      // The app should ask rather than wait to be told. Two things need an
      // answer: a plan whose day has passed with nobody saying whether it
      // happened, and a date we went on that nobody has said anything about.
      // Both leave this list the moment they're answered.
      // Keyed to you, not to the record: her answering doesn't answer for you.
      const iSaidMyPiece = !!memoriesOf(it)[me]
      if ((gone && it.status === 'planned') || (it.status === 'done' && !iSaidMyPiece)) {
        unanswered.push(it)
        continue
      }

      if (!gone && it.status !== 'done' && it.status !== 'cancelled') upcoming.push(it)
      else past.push(it)
    }

    const byDay = (a: DateIdea, b: DateIdea) =>
      (a.scheduledFor ?? '').localeCompare(b.scheduledFor ?? '')

    upcoming.sort(byDay)
    past.sort((a, b) => byDay(b, a)) // most recent first
    unanswered.sort((a, b) => byDay(b, a)) // the freshest memory first
    someday.sort((a, b) => b.createdAt - a.createdAt)

    // Rides along on the "next up" heading rather than taking a row of its own:
    // it's the question you open the app to answer, and it costs no layout.
    const soonest = upcoming[0]?.scheduledFor
    const days = soonest ? differenceInCalendarDays(parseISO(soonest), new Date()) : null
    const countdown =
      days === null ? null : days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`

    return { unanswered, upcoming, past, someday, countdown }
  }, [items, me])

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="pixel-box-sm max-w-xs px-3 py-2 text-center text-sm text-[var(--color-deep)]">
          {error}
        </p>
      </div>
    )
  }

  // Signed in, but no members/{uid} document says which couple you're in.
  // Without one there's nothing to show and nowhere to save.
  if (membership.state === 'unassigned') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <PixelHeart size={40} color="var(--color-lav)" outline />
        <p className="font-[family-name:var(--font-display)] text-lg font-bold">
          not paired up yet
        </p>
        <p className="prose max-w-xs text-sm text-[var(--color-ink)]/70">
          This account isn&rsquo;t in a couple, so there are no dates to show.
          Whoever set this up needs to add you.
        </p>
      </div>
    )
  }

  if (loading || membership.state === 'loading') {
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
          forecasts={weather}
          soonestId={agenda.upcoming[0]?.id ?? null}
          countdown={agenda.countdown}
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
      forecasts={weather}
      soonestId={agenda.upcoming[0]?.id ?? null}
      countdown={agenda.countdown}
      activeId={activeId}
      onHover={hasHover ? setActiveId : undefined}
    />
  )

  const body = isWide ? (
    // Wide: the shell is a two-screen console, everything visible and linked.
    <div className="flex min-h-0 flex-1 flex-col">
      {/* One strip across the top ties the three panes together — without it
          they read as three unrelated boxes that happen to be adjacent. */}
      <div className="flex shrink-0 items-center justify-between border-b-[3px] border-[var(--color-ink)] bg-[var(--color-card)] px-4 py-2">
        <span className="font-[family-name:var(--font-display)] text-base font-bold">
          our dates
        </span>
        {milestone && (
          <span className="legend text-[var(--color-ink)]/60">{milestone}</span>
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex w-[24rem] shrink-0 flex-col border-r-[3px] border-[var(--color-ink)]">
          {calendarPane}
        </div>
        {mapPane}
        {/* Wider than it was: cards were coming out narrower here than on a
            375px phone, which made the widest screen the worst place to read
            them. */}
        <div className="w-80 shrink-0 overflow-y-auto border-l-[3px] border-[var(--color-ink)] pb-28">
          {ideasPane}
        </div>
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
  forecasts: Record<string, import('../lib/weather').Forecast>
  activeId: string | null
  /** Absent on touch devices — see useHasHover. */
  onHover?: (id: string | null) => void
  /** The single soonest upcoming date — the only card that shows a countdown. */
  soonestId?: string | null
  countdown?: string | null
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
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <PixelHeart size={24} color="var(--color-lav)" outline />
          <p className="prose max-w-[18rem] text-sm text-[var(--color-ink)]/60">
            Nothing here yet — pick a day with something on it, or add one.
          </p>
        </div>
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
              forecast={rest.forecasts[entry.id]}
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
    unanswered: DateIdea[]
    upcoming: DateIdea[]
    past: DateIdea[]
    someday: DateIdea[]
    countdown: string | null
  }
}) {
  const { unanswered, upcoming, past, someday } = agenda
  const empty = !unanswered.length && !upcoming.length && !past.length && !someday.length

  return (
    <div className="space-y-5 p-3">
      {/* The empty state is a section of this list, not a replacement for it.
          Returning early here meant a brand-new account — whose list is empty
          by definition — never got the sign-out below, so it could never sign
          out at all. */}
      {empty ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <PixelHeart size={28} color="var(--color-lav)" outline />
          <p className="prose text-sm text-[var(--color-ink)]/60">
            Nothing yet. Add somewhere you both want to go.
          </p>
        </div>
      ) : (
        <>
          {/* Top of the list on purpose: it's the only section that's asking you
              for something, and it disappears once you've answered. */}
          <Section title="how did it go?" items={unanswered} {...rest} />

          <Section
            title="next up"
            badge={agenda.countdown}
            items={upcoming}
            empty="Nothing planned. Pick a day for one of your ideas."
            {...rest}
          />
          <Section
            title="someday"
            glyph="idea"
            items={someday}
            empty="No loose ideas right now."
            hint="no day picked yet"
            {...rest}
          />
          <Section title="been there" glyph="done" items={past} {...rest} />
        </>
      )}

      {/* Always last, always present — including on an empty account. */}
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
  glyph,
  ...rest
}: ListProps & {
  title: string
  items: DateIdea[]
  empty?: string
  hint?: string
  badge?: string | null
  /** Carries the same colour this status wears on the map. */
  glyph?: DateIdea['status']
}) {
  // A section with nothing in it and nothing to say is just noise.
  if (!items.length && !empty) return null

  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2">
        {glyph && (
          <PixelHeart
            size={14}
            color={pinColor(glyph)}
            outline={glyph === 'idea'}
            bordered
          />
        )}
        <span className="font-[family-name:var(--font-display)] text-lg font-bold">
          {title}
        </span>
        {badge ? (
          <span className="legend border-2 border-[var(--color-ink)] bg-[var(--color-hot)] px-1.5 py-1 text-[var(--color-ink)]">
            {badge}
          </span>
        ) : (
          !glyph &&
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
        <ul>
          {items.map((item) => (
            <DateCard
              key={item.id}
              item={item}
              flat
              countdown={rest.soonestId === item.id ? rest.countdown : null}
              onUpdate={rest.onUpdate}
              onDelete={rest.onDelete}
              onEdit={rest.onEdit}
              onLocate={rest.onLocate}
              forecast={rest.forecasts[item.id]}
              active={rest.activeId === item.id}
              onHover={rest.onHover}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
