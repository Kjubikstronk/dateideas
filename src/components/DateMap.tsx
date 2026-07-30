import { useEffect, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { AdvancedMarker, Map, useMap } from '@vis.gl/react-google-maps'
import { placedOnly, type DateIdea } from '../types'
import PixelHeart from './PixelHeart'
import { HAS_MAPS, MAPS_MAP_ID } from '../lib/maps'

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
  /** Currently highlighted record — driven by hover here or in a list. */
  activeId: string | null
  /** A whole day highlighted from the calendar: every pin on it lights up. */
  activeDay?: string | null
  onActivate: (id: string | null) => void
  onOpen?: (id: string) => void
}

const isLit = (item: DateIdea, p: Props) =>
  p.activeId === item.id ||
  (!!p.activeDay && item.scheduledFor === p.activeDay)

export default function DateMap(props: Props) {
  // Without a key there is nothing to render, so fall back to a plain plot of
  // the same pins. Also covers the key being over quota in production.
  if (!HAS_MAPS) return <MapFallback {...props} />

  return (
    <>
      <Map
        mapId={MAPS_MAP_ID || 'DEMO_MAP_ID'}
        defaultCenter={{ lat: 52.372, lng: 4.895 }}
        defaultZoom={12}
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        className="h-full w-full"
      >
        <FitToPins items={props.items} />
        {placedOnly(props.items).map((it) => (
            <AdvancedMarker
              key={it.id}
              position={{ lat: it.place.lat, lng: it.place.lng }}
              title={it.title}
              onMouseEnter={() => props.onActivate(it.id)}
              onMouseLeave={() => props.onActivate(null)}
              onClick={() => {
                // On touch there is no hover, so a tap does the reveal.
                props.onActivate(it.id)
                props.onOpen?.(it.id)
              }}
            >
              <Pin item={it} active={isLit(it, props)} />
            </AdvancedMarker>
          ))}
      </Map>

      <ActiveCard {...props} />
      <Legend />
    </>
  )
}

/** Frames every pin on first load, so you open the map to the overview. */
function FitToPins({ items }: { items: DateIdea[] }) {
  const map = useMap()
  const placed = useMemo(() => placedOnly(items), [items])

  useEffect(() => {
    if (!map || placed.length === 0) return
    const bounds = new google.maps.LatLngBounds()
    for (const item of placed) {
      bounds.extend({ lat: item.place.lat, lng: item.place.lng })
    }
    map.fitBounds(bounds, 64)
  }, [map, placed])

  return null
}

function Pin({ item, active }: { item: DateIdea; active: boolean }) {
  return (
    <span
      className="block transition-transform duration-75"
      style={{ transform: active ? 'scale(1.5)' : undefined }}
    >
      <PixelHeart
        size={active ? 26 : 22}
        color={pinColor(item.status)}
        outline={item.status === 'idea'}
      />
    </span>
  )
}

/**
 * What you asked for: the pin tells you when you're going.
 *
 * Anchored to the bottom of the map rather than floating beside the cursor —
 * a tooltip that tracks the pointer is unusable on a phone, and this same card
 * serves the tap interaction without a second component.
 */
function ActiveCard({ items, activeId }: Props) {
  const item = items.find((i) => i.id === activeId)
  if (!item) return null

  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 sm:inset-x-auto sm:left-2 sm:max-w-xs">
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

/** The overview needs a key, or the three pin colours mean nothing. */
function Legend() {
  const rows: [string, DateIdea['status']][] = [
    ['planned', 'planned'],
    ['someday', 'idea'],
    ['we went', 'done'],
    ['called off', 'cancelled'],
  ]

  return (
    <div className="pixel-box-sm absolute right-2 top-2 z-10 space-y-1 p-2">
      {rows.map(([label, status]) => (
        <p key={label} className="flex items-center gap-1.5">
          <PixelHeart size={10} color={pinColor(status)} outline={status === 'idea'} />
          <span className="legend text-[var(--color-ink)]/70">{label}</span>
        </p>
      ))}
    </div>
  )
}

/**
 * No Maps key: plot the pins by their real coordinates on a plain field.
 * Positions stay truthful relative to each other, so the overview still works
 * — you just don't get streets. Used by `npm run ui`, and as graceful
 * degradation if the key ever fails in production.
 */
function MapFallback(props: Props) {
  const { items, activeId, onActivate, onOpen } = props
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
    <div className="relative h-full w-full overflow-hidden bg-[var(--color-paper)]">
      {/* Graph paper, so the plot reads as a deliberate diagram rather than a
          map that failed to load. */}
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
              className="absolute -translate-x-1/2 -translate-y-1/2 p-2 transition-transform duration-75"
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
                size={22}
                color={pinColor(item.status)}
                outline={item.status === 'idea'}
              />
            </button>
          )
        })}

      <ActiveCard items={items} activeId={activeId} onActivate={onActivate} />
      <Legend />
    </div>
  )
}
