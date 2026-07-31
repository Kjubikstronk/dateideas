import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { AdvancedMarker, Map, useMap } from '@vis.gl/react-google-maps'
import { placedOnly, type DateIdea, type Place } from '../types'
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

const isLit = (item: DateIdea, p: Props) =>
  p.activeId === item.id || (!!p.activeDay && item.scheduledFor === p.activeDay)

/**
 * Overlays render OUTSIDE `<Map>` and reach it via `useMap(MAP_ID)`. They have
 * to be outside: putting ordinary DOM children inside `<Map>` stops Google
 * initialising the canvas — the map gets stuck showing its static placeholder
 * image forever, with no error in the console.
 */
const MAP_ID = MAP_INSTANCE_ID

export default function DateMap(props: Props) {
  if (!HAS_MAPS) return <MapFallback {...props} />
  return <LiveMap {...props} />
}

function LiveMap(props: Props) {
  const map = useMap(MAP_ID)
  const search = usePlaceSearch()

  /** A place you're looking at but haven't committed to yet. */
  const [candidate, setCandidate] = useState<Place | null>(null)
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null)

  const placed = useMemo(() => placedOnly(props.items), [props.items])

  // Frame every pin on first load, so you open the map to the overview.
  useEffect(() => {
    if (!map || placed.length === 0) return
    const bounds = new google.maps.LatLngBounds()
    for (const item of placed) bounds.extend({ lat: item.place.lat, lng: item.place.lng })
    map.fitBounds(bounds, 64)
  }, [map, placed])

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
      <Map
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
        {placed.map((it) => (
          <AdvancedMarker
            key={it.id}
            position={{ lat: it.place.lat, lng: it.place.lng }}
            title={it.title}
            onMouseEnter={() => onActivate(it.id)}
            onMouseLeave={() => onActivate(null)}
            onClick={() => {
              setCandidate(null)
              onActivate(it.id)
              props.onOpen?.(it.id)
            }}
          >
            <Pin item={it} active={isLit(it, props)} />
          </AdvancedMarker>
        ))}

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
              className="block h-3.5 w-3.5 border-2 border-[var(--color-ink)] bg-[var(--color-aqua)]"
            />
          </AdvancedMarker>
        )}
      </Map>

      {/* Overlays live outside <Map> — see the note on MAP_ID. */}
      <SearchBar search={search} onPick={goTo} />
      <LocateButton onFound={setMe} />

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

      <Legend hidden={!!candidate || !!props.activeId} />
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
          <p className="legend mt-1 border-2 border-[var(--color-ink)] bg-[var(--color-card)] px-2 py-1">
            looking…
          </p>
        )}
        {failed && (
          <p className="legend mt-1 border-2 border-[var(--color-ink)] bg-[var(--color-card)] px-2 py-1 text-[var(--color-deep)]">
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
                  <span className="prose block truncate text-xs font-normal text-[var(--color-ink)]/60">
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
    <div className="absolute bottom-2 right-2 z-20 flex flex-col items-end gap-1">
      {state === 'denied' && (
        <p className="legend max-w-[12rem] border-2 border-[var(--color-ink)] bg-[var(--color-card)] px-2 py-1 text-[var(--color-deep)]">
          location is blocked — allow it in your browser settings
        </p>
      )}
      {state === 'unavailable' && (
        <p className="legend max-w-[12rem] border-2 border-[var(--color-ink)] bg-[var(--color-card)] px-2 py-1 text-[var(--color-deep)]">
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
          <p className="prose mt-1 text-xs text-[var(--color-ink)]/60">{place.address}</p>
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

/** Hovering or tapping an existing pin: the date it belongs to. */
function ActiveCard({ items, activeId }: Props) {
  const item = items.find((i) => i.id === activeId)
  if (!item) return null

  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-20 z-10 sm:inset-x-auto sm:bottom-2 sm:left-2 sm:max-w-xs">
      <div className="pixel-box boot p-3">
        <p className="flex items-start gap-2">
          <span aria-hidden="true" className="text-lg leading-none">
            {item.emoji}
          </span>
          <span
            className={[
              'font-[family-name:var(--font-display)] font-bold leading-tight',
              item.status === 'cancelled' && 'text-[var(--color-mute)] line-through',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {item.title}
          </span>
        </p>

        <p
          className={
            item.status === 'cancelled'
              ? 'legend mt-2 text-[var(--color-mute)]'
              : 'legend mt-2 text-[var(--color-deep)]'
          }
        >
          {item.scheduledFor
            ? `${format(parseISO(item.scheduledFor), 'EEE d MMM').toLowerCase()}${
                item.time ? ` · ${item.time}` : ''
              }`
            : 'no day picked yet'}
        </p>

        {item.status === 'cancelled' && (
          <p className="prose mt-1 text-xs text-[var(--color-mute)]">
            called off{item.cancelReason ? ` — ${item.cancelReason}` : ''}
          </p>
        )}

        {item.place && (
          <p className="prose mt-1 truncate text-xs text-[var(--color-ink)]/60">
            {item.place.name}
          </p>
        )}
      </div>
    </div>
  )
}

function Pin({ item, active }: { item: DateIdea; active: boolean }) {
  return (
    <span
      className="block transition-transform duration-75"
      style={{ transform: active ? 'scale(1.5)' : undefined }}
    >
      <PixelHeart
        size={active ? 28 : 24}
        color={pinColor(item.status)}
        outline={item.status === 'idea'}
        bordered
      />
    </span>
  )
}

/** The overview needs a key, or the pin colours mean nothing. */
function Legend({ hidden }: { hidden?: boolean }) {
  if (hidden) return null

  const rows: [string, DateIdea['status']][] = [
    ['planned', 'planned'],
    ['someday', 'idea'],
    ['we went', 'done'],
    ['called off', 'cancelled'],
  ]

  return (
    <div className="pixel-box-sm absolute bottom-2 left-2 z-10 space-y-1 p-2">
      {rows.map(([label, status]) => (
        <p key={label} className="flex items-center gap-1.5">
          <PixelHeart size={14} color={pinColor(status)} outline={status === 'idea'} bordered />
          <span className="legend text-[var(--color-ink)]/70">{label}</span>
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
  const placed = placedOnly(items)

  const box = useMemo(() => {
    if (placed.length === 0) return null
    const lats = placed.map((i) => i.place.lat)
    const lngs = placed.map((i) => i.place.lng)
    const pad = 0.15
    const latSpan = Math.max(...lats) - Math.min(...lats) || 0.01
    const lngSpan = Math.max(...lngs) - Math.min(...lngs) || 0.01
    return {
      minLat: Math.min(...lats) - latSpan * pad,
      maxLat: Math.max(...lats) + latSpan * pad,
      minLng: Math.min(...lngs) - lngSpan * pad,
      maxLng: Math.max(...lngs) + lngSpan * pad,
    }
  }, [placed])

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

      <p className="legend absolute left-2 top-2 z-10 border-2 border-[var(--color-ink)] bg-[var(--color-card)] px-2 py-1">
        no map key · positions only
      </p>

      {box &&
        placed.map((item) => {
          const left = ((item.place.lng - box.minLng) / (box.maxLng - box.minLng)) * 100
          const top = ((box.maxLat - item.place.lat) / (box.maxLat - box.minLat)) * 100
          const active = isLit(item, props)

          return (
            <button
              key={item.id}
              type="button"
              className="absolute p-2 transition-transform duration-75"
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
              aria-label={`${item.title}${
                item.scheduledFor
                  ? `, ${format(parseISO(item.scheduledFor), 'EEEE d MMMM')}`
                  : ', no day picked yet'
              }`}
            >
              <PixelHeart
                size={24}
                color={pinColor(item.status)}
                outline={item.status === 'idea'}
                bordered
              />
            </button>
          )
        })}

      <ActiveCard {...props} />
      <Legend />
    </div>
  )
}
