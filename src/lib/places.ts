import { useEffect, useRef, useState } from 'react'
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import { MAP_INSTANCE_ID, lastViewport } from './maps'
import type { Place } from '../types'

/**
 * Only the fields we actually use. Places bills Place Details by the tier of
 * the highest field requested, so anything unused here costs real money per
 * lookup for data we throw away.
 *
 * `photos` was in this list and its result was never rendered anywhere — the
 * stored photoUrl had no reader. Removed.
 *
 * `rating` is the one remaining Enterprise-tier field, and it buys exactly the
 * "4.3 ★" line on the map's candidate card. Dropping it too would put every
 * lookup on the cheapest tier.
 */
const FIELDS = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'rating',
] as const

/**
 * Place details, once per place per session.
 *
 * Every tap on a map POI fired a fresh billable lookup, with no dedupe — so
 * tapping the same café three times while deciding cost three of them, as did
 * every stray tap while panning. Details are stable enough that a
 * session-lifetime cache is safe, and it turns the one uncapped spend vector
 * into a bounded one.
 */
const detailCache = new globalThis.Map<string, Place>()

type PlacesLib = google.maps.PlacesLibrary

export function toPlace(
  p: google.maps.places.Place,
  fallbackName = '',
): Place {
  return {
    name: p.displayName ?? fallbackName,
    address: p.formattedAddress ?? '',
    lat: p.location?.lat() ?? null,
    lng: p.location?.lng() ?? null,
    placeId: p.id ?? null,
    // Never requested any more — see FIELDS.
    photoUrl: null,
    rating: p.rating ?? null,
  }
}

/**
 * Look up a place from an id — used when you tap a point of interest on the
 * map, which is how Google Maps itself behaves.
 */
export async function fetchPlaceById(
  places: PlacesLib | null,
  placeId: string,
): Promise<Place | null> {
  if (!places) return null
  const hit = detailCache.get(placeId)
  if (hit) return hit
  try {
    const place = new places.Place({ id: placeId })
    await place.fetchFields({ fields: [...FIELDS] })
    const converted = toPlace(place)
    if (converted) detailCache.set(placeId, converted)
    return converted
  } catch {
    return null
  }
}

/**
 * Shared autocomplete state for both the editor and the map's search bar.
 *
 * The session token is the part worth understanding: it ties a run of
 * keystrokes plus the final detail lookup into one billable session, instead
 * of Google charging per keystroke. It's cleared after each pick so the next
 * search starts a fresh session.
 */
export function usePlaceSearch() {
  const places = useMapsLibrary('places')
  const map = useMap(MAP_INSTANCE_ID)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<google.maps.places.AutocompleteSuggestion[]>([])
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const session = useRef<google.maps.places.AutocompleteSessionToken | null>(null)

  useEffect(() => {
    if (!places || query.trim().length < 2) {
      setResults([])
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      setBusy(true)
      setFailed(false)
      try {
        session.current ??= new places.AutocompleteSessionToken()

        // Prefer results near where you're looking. `locationBias`, not
        // `locationRestriction`: somewhere far away should still be findable
        // when you're planning a trip — it just shouldn't come first.
        const bias = map?.getBounds()?.toJSON() ?? lastViewport()

        const { suggestions } =
          await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query,
            sessionToken: session.current,
            ...(bias ? { locationBias: bias } : {}),
          })
        if (!cancelled) setResults(suggestions.slice(0, 5))
      } catch {
        if (!cancelled) {
          setFailed(true)
          setResults([])
        }
      } finally {
        if (!cancelled) setBusy(false)
      }
    }, 250) // one request per pause, not per keystroke

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [places, query, map])

  async function choose(
    suggestion: google.maps.places.AutocompleteSuggestion,
  ): Promise<Place | null> {
    const prediction = suggestion.placePrediction
    if (!prediction) return null

    const place = prediction.toPlace()
    await place.fetchFields({ fields: [...FIELDS] })

    session.current = null
    setQuery('')
    setResults([])
    return toPlace(place, prediction.text.text)
  }

  function clear() {
    setQuery('')
    setResults([])
    setFailed(false)
  }

  return { places, query, setQuery, results, busy, failed, choose, clear }
}
