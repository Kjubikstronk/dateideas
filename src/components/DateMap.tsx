import { useEffect, useMemo, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
// Aliased: the library's `Map` component otherwise shadows the global Map
// constructor, which broke `new Map()` in this file.
import { AdvancedMarker, Map as GoogleMap, useMap } from '@vis.gl/react-google-maps'
import { placedOnly, type DateIdea, type Place, type PlacedDate } from '../types'
import PixelHeart from './PixelHeart'
import { HAS_MAPS, MAPS_MAP_ID, MAP_INSTANCE_ID, rememberViewport } from '../lib/maps'
import { fetchPlaceById, usePlaceSearch } from '../lib/places'

/**
 * The map is deliberately NOT recoloured bubblegum.
 *
 * Restyling Google's roads and labels to the Y2K palette was the obvious move,
 * and it makes the one thing you actually need to read — where the place is —
 * much harder to read. The personality lives in the device frame around the
 * map, the pins, and the cards instead. The map itself stays legible.
 */

export const pinColor = (status: DateIdea['status']) =>
  status === 'done'
    ? 'var(--color-aqua)'
    : status === 'planned'
      ? 'var(--color-hot)'
      : status === 'cancelled'
        ? 'var(--color-mute)'
        : 'var(--color-lav)'

type Props = {
  items: DateIdea[]
  activeId: string | null
  activeDay?: string | null
  onActivate: (id: string | null) => void
  onOpen?: (id: string) => void
  /** Start a new date from a place found on the map. */
  onAddPlace?: (place: Place) => void
  /**
   * Fly the map somewhere. The nonce is what makes it fire: asking to fly to
   * the same pin twice is a real request, and comparing coordinates alone
   * would swallow the second one.
   */
  flyTo?: { lat: number; lng: number; nonce: number } | null
}

/** Identifies a place: the Places id when we have one, else its coordinates. */
const placeKey = (item: PlacedDate) =>
  item.place.placeId ?? `${item.place.lat.toFixed(5)},${item.place.lng.toFixed(5)}`

/**
 * Dates sharing a place share a pin.
 *
 * Two dates at one venue drew two markers at identical coordinates, one exactly
 * on top of the other, so the one underneath was invisible and unclickable.
 */
function groupByPlace(items: DateIdea[]): [string, PlacedDate[]][] {
  const buckets = new globalThis.Map<string, PlacedDate[]>()
  for (const item of placedOnly(items)) {
    const key = placeKey(item)
    const bucket = buckets.get(key)
    if (bucket) bucket.push(item)
    else buckets.set(key, [item])
  }
  // Soonest first inside a pin, so the card leads with what's next.
  for (const bucket of buckets.values()) {
    bucket.sort((a, b) => (a.scheduledFor ?? '~').localeCompare(b.scheduledFor ?? '~'))
  }
  return [...buckets.entries()]
}

const isLit = (item: DateIdea, p: Props) =>
  p.activeId === item.id || (!!p.activeDay && item.scheduledFor === p.activeDay)

/**
 * Overlays render OUTSIDE `<Map>` and reach it via `useMap(MAP_ID)`. They have
 * to be outside: putting ordinary DOM children inside `<Map>` stops Google
 * initialising the canvas — the map gets stuck showing its static placeholder
 * image forever, with no error in the console.
 */
const MAP_ID = MAP_INSTANCE_ID

/**
 * Pins keep a constant screen size at every zoom, which is right when you're
 * looking at a street and wrong when you're looking at a continent: a 24px
 * heart then covers a whole city, and a handful of them merge into one blob.
 * So shrink the glyph as the view widens.
 *
 * Full size at z12 (about a city) down to half at z6 (about a country).
 * Pinch reports fractional zoom, so this is a ramp rather than a step — but
 * the result is rounded to whole pixels, and the glyph is drawn as literal
 * pixels, so what you actually see is a handful of discrete sizes.
 */
const PIN_MAX = 24
const PIN_MIN = 12
const ZOOM_FULL = 12
const ZOOM_WIDE = 6

function pinSize(zoom: number | null | undefined) {
  // Before the map reports a zoom, draw the size we always drew.
  if (zoom == null) return PIN_MAX
  const t = (zoom - ZOOM_WIDE) / (ZOOM_FULL - ZOOM_WIDE)
  return Math.round(PIN_MIN + (PIN_MAX - PIN_MIN) * Math.min(1, Math.max(0, t)))
}

/** The map's current zoom, or null until it reports one. */
function useZoom() {
  const map = useMap(MAP_ID)
  const [zoom, setZoom] = useState<number | null>(null)

  useEffect(() => {
    if (!map) return
    setZoom(map.getZoom() ?? null)
    const l = map.addListener('zoom_changed', () => setZoom(map.getZoom() ?? null))
    return () => l.remove()
  }, [map])

  return zoom
}

export default function DateMap(props: Props) {
  if (!HAS_MAPS) return <MapFallback {...props} />
  return <LiveMap {...props} />
}

function LiveMap(props: Props) {
  const map = useMap(MAP_ID)
  const search = usePlaceSearch()
  const zoom = useZoom()

  /** A place you're looking at but haven't committed to yet. */
  const [candidate, setCandidate] = useState<Place | null>(null)
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null)

  const groups = useMemo(() => groupByPlace(props.items), [props.items])
  const framed = useRef(false)

  // Frame every pin on first load, so you open the map to the overview.
  useEffect(() => {
    if (!map || groups.length === 0) return
    // Once per mount. `groups` derives from a fresh array on every Firestore
    // emission, so this used to re-run whenever either partner edited
    // anything — including right after adding a place from the map, which
    // threw you away from the pin you'd just dropped.
    if (framed.current) return
    framed.current = true
    const bounds = new google.maps.LatLngBounds()
    for (const [, items] of groups) {
      bounds.extend({ lat: items[0].place.lat, lng: items[0].place.lng })
    }
    map.fitBounds(bounds, 64)
  }, [map, groups])

  // Tapping a point of interest, exactly like Google Maps. The map hands us a
  // placeId; `stop()` suppresses Google's own info window so ours shows instead.
  const { onActivate } = props
  const placesLib = search.places
  useEffect(() => {
    if (!map || !placesLib) return
    const listener = map.addListener(
      'click',
      async (e: google.maps.MapMouseEvent & { placeId?: string; stop?: () => void }) => {
        if (!e.placeId) return
        e.stop?.()
        const place = await fetchPlaceById(placesLib, e.placeId)
        if (place) {
          setCandidate(place)
          onActivate(null)
        }
      },
    )
    return () => listener.remove()
    // `onActivate` and `placesLib` are pulled out of props so this doesn't
    // re-subscribe on every render.
  }, [map, placesLib, onActivate])

  const fly = props.flyTo
  useEffect(() => {
    if (!map || !fly) return
    map.panTo({ lat: fly.lat, lng: fly.lng })
    map.setZoom(16)
  }, [map, fly?.nonce])  // eslint-disable-line react-hooks/exhaustive-deps

  // Remember where we're looking so place search stays local, even after a
  // reload or when the map tab isn't mounted.
  useEffect(() => {
    if (!map) return
    const l = map.addListener('idle', () => rememberViewport(map.getBounds()))
    return () => l.remove()
  }, [map])

  function goTo(place: Place) {
    setCandidate(place)
    onActivate(null)
    if (map && place.lat != null && place.lng != null) {
      map.panTo({ lat: place.lat, lng: place.lng })
      map.setZoom(16)
    }
  }

  return (
    <>
      <GoogleMap
        id={MAP_ID}
        mapId={MAPS_MAP_ID || 'DEMO_MAP_ID'}
        defaultCenter={{ lat: 52.372, lng: 4.895 }}
        defaultZoom={12}
        gestureHandling="greedy"
        // No zoomControl: Google's buttons are unstyleable, clash with the
        // pixel design, and landed on top of our locate button. Scroll and
        // pinch both still zoom.
        disableDefaultUI
        className="absolute inset-0"
      >
        {groups.map(([key, items]) => {
          const lead = items[0]
          const lit = items.some((it) => isLit(it, props))
          return (
            <AdvancedMarker
              key={key}
              position={{ lat: lead.place.lat, lng: lead.place.lng }}
              title={items.map((i) => i.title).join(' · ')}
              onMouseEnter={() => onActivate(lead.id)}
              onMouseLeave={() => onActivate(null)}
              onClick={() => {
                setCandidate(null)
                onActivate(lead.id)
                props.onOpen?.(lead.id)
              }}
            >
              <Pin item={lead} active={lit} count={items.length} size={pinSize(zoom)} />
            </AdvancedMarker>
          )
        })}

        {candidate?.lat != null && candidate.lng != null && (
          <AdvancedMarker position={{ lat: candidate.lat, lng: candidate.lng }}>
            <span className="beat block">
              <PixelHeart size={32} color="var(--color-lav)" bordered />
            </span>
          </AdvancedMarker>
        )}

        {me && (
          <AdvancedMarker position={me} title="You are here">
            <span
              aria-hidden="true"
              className="block h-3.5 w-3.5 border-2 border-[var(--color-line)] bg-[var(--color-aqua)]"
            />
          </AdvancedMarker>
        )}
      </GoogleMap>

      {/* Overlays live outside <Map> — see the note on MAP_ID. */}
      <SearchBar search={search} onPick={goTo} />
      {/* Key and locate control share the one corner the cards never take.
          The legend used to sit bottom-left and disappear the moment a pin
          went active — which is exactly when someone new wants to know what
          the colours mean. */}
      <div className="absolute bottom-2 right-2 z-20 flex flex-col items-end gap-2">
        {/* The card spans the full width just above this, so the key steps
            aside while one is open — it's reference material, not a response
            to the tap, so it fades rather than popping out. */}
        <div
          className={[
            'transition-opacity duration-75 ease-snap',
            candidate || props.activeId ? 'pointer-events-none opacity-0' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <Legend />
        </div>
        <LocateButton onFound={setMe} />
      </div>

      {candidate ? (
        <CandidateCard
          place={candidate}
          onAdd={() => {
            props.onAddPlace?.(candidate)
            setCandidate(null)
          }}
          onDismiss={() => setCandidate(null)}
        />
      ) : (
        <ActiveCard {...props} />
      )}

    </>
  )
}

/** Search without leaving the map. Picking a result drops a candidate pin. */
function SearchBar({
  search,
  onPick,
}: {
  search: ReturnType<typeof usePlaceSearch>
  onPick: (p: Place) => void
}) {
  const { query, setQuery, results, busy, failed, choose } = search

  return (
    <div className="absolute left-2 right-2 top-2 z-20 max-w-[17rem]">
      <input
        className="pixel-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="search the map…"
        autoComplete="off"
        aria-label="Search for a place on the map"
      />

      <div aria-live="polite">
        {busy && (
          <p className="legend mt-1 border-2 border-[var(--color-line)] bg-[var(--color-card)] px-2 py-1">
            looking…
          </p>
        )}
        {failed && (
          <p className="legend mt-1 border-2 border-[var(--color-line)] bg-[var(--color-card)] px-2 py-1 text-[var(--color-deep)]">
            search isn&rsquo;t responding
          </p>
        )}
      </div>

      {results.length > 0 && (
        <ul className="mt-1 space-y-1">
          {results.map((s, i) => (
            <li key={s.placePrediction?.placeId ?? i}>
              <button
                type="button"
                className="pixel-btn w-full px-2 py-2 text-left"
                onClick={async () => {
                  const picked = await choose(s)
                  if (picked) onPick(picked)
                }}
              >
                <span className="block truncate font-[family-name:var(--font-display)] text-sm font-bold">
                  {s.placePrediction?.mainText?.text ?? s.placePrediction?.text.text}
                </span>
                {s.placePrediction?.secondaryText && (
                  <span className="prose block truncate text-xs font-normal text-[var(--color-text)]/60">
                    {s.placePrediction.secondaryText.text}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

type GeoState = 'idle' | 'locating' | 'denied' | 'unavailable'

function LocateButton({ onFound }: { onFound: (c: { lat: number; lng: number }) => void }) {
  const map = useMap(MAP_ID)
  const [state, setState] = useState<GeoState>('idle')

  function locate() {
    if (!navigator.geolocation) return setState('unavailable')
    setState('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        onFound(here)
        map?.panTo(here)
        map?.setZoom(15)
        setState('idle')
      },
      (err) => {
        // 1 = permission denied, and it's the only one you can act on.
        setState(err.code === 1 ? 'denied' : 'unavailable')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 },
    )
  }

  return (
    // Positioned by the stack it sits in, not by itself.
    <div className="flex flex-col items-end gap-1">
      {state === 'denied' && (
        <p className="legend max-w-[12rem] border-2 border-[var(--color-line)] bg-[var(--color-card)] px-2 py-1 text-[var(--color-deep)]">
          location is blocked — allow it in your browser settings
        </p>
      )}
      {state === 'unavailable' && (
        <p className="legend max-w-[12rem] border-2 border-[var(--color-line)] bg-[var(--color-card)] px-2 py-1 text-[var(--color-deep)]">
          couldn&rsquo;t get your location
        </p>
      )}
      <button
        type="button"
        onClick={locate}
        className="pixel-btn px-3 py-2 text-base"
        aria-label="Find my location"
        disabled={state === 'locating'}
      >
        {state === 'locating' ? '…' : '◎'}
      </button>
    </div>
  )
}

/**
 * A place you've found but not committed to. The whole point of the map-first
 * flow: see somewhere, add it as a date without opening anything else first.
 */
function CandidateCard({
  place,
  onAdd,
  onDismiss,
}: {
  place: Place
  onAdd: () => void
  onDismiss: () => void
}) {
  return (
    <div className="absolute inset-x-2 bottom-20 z-30 sm:inset-x-auto sm:bottom-2 sm:left-2 sm:max-w-xs">
      <div className="pixel-box boot p-3">
        <p className="font-[family-name:var(--font-display)] font-bold leading-tight">
          {place.name}
        </p>
        {place.address && (
          <p className="prose mt-1 text-xs text-[var(--color-text)]/60">{place.address}</p>
        )}
        {place.rating != null && (
          <p className="legend mt-1 text-[var(--color-deep)]">{place.rating.toFixed(1)} ★</p>
        )}

        <div className="mt-3 flex gap-2">
          <button type="button" className="pixel-btn pixel-btn-primary flex-1 px-3 py-2 text-sm" onClick={onAdd}>
            add as a date
          </button>
          <button type="button" className="pixel-btn legend px-2 py-1" onClick={onDismiss}>
            nope
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Hovering or tapping a pin: everything that happens at that place.
 *
 * A pin can hold several dates — dinner there in March, again in June — and
 * showing only one of them was the whole bug. The place is named once at the
 * top and each date listed under it.
 */
function ActiveCard({ items, activeId }: Props) {
  const active = items.find((i) => i.id === activeId)
  if (!active) return null

  const here = placedOnly(items).filter(
    (i) => placedOnly([active])[0] && placeKey(i) === placeKey(placedOnly([active])[0]),
  )
  // An unplaced date has no pin, so it can only ever be shown on its own.
  const shown: DateIdea[] = here.length ? here : [active]

  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-20 z-10 sm:inset-x-auto sm:bottom-2 sm:left-2 sm:max-w-xs">
      <div className="pixel-box boot max-h-56 overflow-y-auto p-3">
        {active.place && (
          <p className="font-[family-name:var(--font-display)] font-bold leading-tight">
            {active.place.name}
          </p>
        )}

        <ul className={active.place ? 'mt-2 space-y-2' : 'space-y-2'}>
          {shown.map((item) => (
            <li key={item.id} className="flex items-start gap-2">
              <span aria-hidden="true" className="text-base leading-none">
                {item.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={[
                    'block text-sm leading-tight',
                    item.status === 'cancelled' && 'text-[var(--color-mute)] line-through',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {item.title}
                </span>
                <span
                  className={
                    item.status === 'cancelled'
                      ? 'legend mt-1 block text-[var(--color-mute)]'
                      : 'legend mt-1 block text-[var(--color-deep)]'
                  }
                >
                  {item.scheduledFor
                    ? `${format(parseISO(item.scheduledFor), 'EEE d MMM').toLowerCase()}${
                        item.time ? ` · ${item.time}` : ''
                      }`
                    : 'no day picked yet'}
                </span>
                {item.status === 'cancelled' && (
                  <span className="prose mt-0.5 block text-xs text-[var(--color-mute)]">
                    called off{item.cancelReason ? ` — ${item.cancelReason}` : ''}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>

        {shown.length > 1 && (
          <p className="legend mt-2 text-[var(--color-text)]/60">
            {shown.length} dates here
          </p>
        )}
      </div>
    </div>
  )
}

function Pin({
  item,
  active,
  count = 1,
  size = PIN_MAX,
}: {
  item: DateIdea
  active: boolean
  count?: number
  size?: number
}) {
  return (
    <span
      className="relative block transition-transform duration-75 ease-snap"
      style={{ transform: active ? 'scale(1.5)' : undefined }}
    >
      {/*
        A shrunken pin must not become a smaller thing to tap. This pad is
        absolutely positioned, so it never enters the marker's layout box and
        therefore never shifts the pin off its coordinates.
      */}
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2"
      />
      <PixelHeart
        size={active ? size + 4 : size}
        color={pinColor(item.status)}
        outline={item.status === 'idea'}
        bordered
      />
      {/*
        Below half size the badge would be wider than the heart it sits on, and
        its digit is unreadable at that zoom anyway.
      */}
      {count > 1 && size > (PIN_MIN + PIN_MAX) / 2 && (
        <span className="legend absolute -right-2 -top-2 border-2 border-[var(--color-line)] bg-[var(--color-card)] px-1 leading-none">
          {count}
        </span>
      )}
    </span>
  )
}

/** The overview needs a key, or the pin colours mean nothing. */
function Legend() {
  const rows: [string, DateIdea['status']][] = [
    ['planned', 'planned'],
    ['someday', 'idea'],
    ['we went', 'done'],
    ['called off', 'cancelled'],
  ]

  return (
    <div className="pixel-box-sm space-y-1 p-2">
      {rows.map(([label, status]) => (
        <p key={label} className="flex items-center gap-1.5">
          <PixelHeart size={14} color={pinColor(status)} outline={status === 'idea'} bordered />
          <span className="legend text-[var(--color-text)]/70">{label}</span>
        </p>
      ))}
    </div>
  )
}

/**
 * No Maps key: plot the pins by their real coordinates on a plain field.
 * Positions stay truthful relative to each other, so the overview still works
 * — you just don't get streets, search, or tappable places.
 */
function MapFallback(props: Props) {
  const { items, onActivate, onOpen } = props
  const groups = useMemo(() => groupByPlace(items), [items])

  const box = useMemo(() => {
    if (groups.length === 0) return null
    const lats = groups.map(([, g]) => g[0].place.lat)
    const lngs = groups.map(([, g]) => g[0].place.lng)
    const pad = 0.15
    const latSpan = Math.max(...lats) - Math.min(...lats) || 0.01
    const lngSpan = Math.max(...lngs) - Math.min(...lngs) || 0.01
    return {
      minLat: Math.min(...lats) - latSpan * pad,
      maxLat: Math.max(...lats) + latSpan * pad,
      minLng: Math.min(...lngs) - lngSpan * pad,
      maxLng: Math.max(...lngs) + lngSpan * pad,
    }
  }, [groups])

  return (
    <div className="absolute inset-0 overflow-hidden bg-[var(--color-paper)]">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(var(--color-lav) 1px, transparent 1px), linear-gradient(90deg, var(--color-lav) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <p className="legend absolute left-2 top-2 z-10 border-2 border-[var(--color-line)] bg-[var(--color-card)] px-2 py-1">
        no map key · positions only
      </p>

      {box &&
        groups.map(([key, group]) => {
          const item = group[0]
          const left = ((item.place.lng - box.minLng) / (box.maxLng - box.minLng)) * 100
          const top = ((box.maxLat - item.place.lat) / (box.maxLat - box.minLat)) * 100
          const active = group.some((g) => isLit(g, props))

          return (
            <button
              key={key}
              type="button"
              className="absolute p-2 transition-transform duration-75 ease-snap"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                transform: `translate(-50%, -50%) scale(${active ? 1.5 : 1})`,
              }}
              onMouseEnter={() => onActivate(item.id)}
              onMouseLeave={() => onActivate(null)}
              onFocus={() => onActivate(item.id)}
              onBlur={() => onActivate(null)}
              onClick={() => {
                onActivate(item.id)
                onOpen?.(item.id)
              }}
              aria-label={
                group.length > 1
                  ? `${item.place.name}, ${group.length} dates here`
                  : `${item.title}${
                      item.scheduledFor
                        ? `, ${format(parseISO(item.scheduledFor), 'EEEE d MMMM')}`
                        : ', no day picked yet'
                    }`
              }
            >
              <span className="relative block">
                <PixelHeart
                  size={24}
                  color={pinColor(item.status)}
                  outline={item.status === 'idea'}
                  bordered
                />
                {group.length > 1 && (
                  <span className="legend absolute -right-2 -top-2 border-2 border-[var(--color-line)] bg-[var(--color-card)] px-1 leading-none">
                    {group.length}
                  </span>
                )}
              </span>
            </button>
          )
        })}

      <ActiveCard {...props} />
      <div className="absolute bottom-2 right-2 z-10">
        <Legend />
      </div>
    </div>
  )
}
