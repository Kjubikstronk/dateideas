import { useEffect, useRef, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import type { Place } from '../types'

/** Only the fields we store. Places bills by field tier, so asking for more
    than this costs real money for data we'd throw away. */
const FIELDS = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'photos',
  'rating',
] as const

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
    photoUrl: p.photos?.[0]?.getURI({ maxWidth: 640 }) ?? null,
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
  try {
    const place = new places.Place({ id: placeId })
    await place.fetchFields({ fields: [...FIELDS] })
    return toPlace(place)
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
        const { suggestions } =
          await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query,
            sessionToken: session.current,
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
  }, [places, query])

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
