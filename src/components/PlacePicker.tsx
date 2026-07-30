import { useEffect, useRef, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { HAS_MAPS } from '../lib/maps'
import type { Place } from '../types'

type Props = {
  value: Place | null
  onChange: (place: Place | null) => void
}

/**
 * Venue search. Type "sush" and pick the place; address, coordinates, photo and
 * rating come back filled in.
 *
 * Two billing details worth keeping:
 *  - A session token ties the keystrokes and the final detail fetch into one
 *    billable session instead of charging per keystroke.
 *  - `fetchFields` only asks for the fields actually stored; Places bills by
 *    field tier, so requesting everything would cost noticeably more.
 */
export default function PlacePicker({ value, onChange }: Props) {
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
    }, 250) // don't fire a request on every keystroke

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [places, query])

  async function pick(suggestion: google.maps.places.AutocompleteSuggestion) {
    const prediction = suggestion.placePrediction
    if (!prediction) return

    const place = prediction.toPlace()
    await place.fetchFields({
      fields: ['id', 'displayName', 'formattedAddress', 'location', 'photos', 'rating'],
    })

    onChange({
      name: place.displayName ?? prediction.text.text,
      address: place.formattedAddress ?? '',
      lat: place.location?.lat() ?? null,
      lng: place.location?.lng() ?? null,
      placeId: place.id ?? null,
      photoUrl: place.photos?.[0]?.getURI({ maxWidth: 640 }) ?? null,
      rating: place.rating ?? null,
    })

    // A session ends when a place is chosen; the next search starts a new one.
    session.current = null
    setQuery('')
    setResults([])
  }

  if (value) {
    return (
      <div className="space-y-1.5">
        <span className="legend">where</span>
        <div className="pixel-box-sm flex items-start gap-2 p-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-[family-name:var(--font-display)] font-bold">
              {value.name}
            </p>
            {value.address && (
              <p className="prose truncate text-xs text-[var(--color-ink)]/60">
                {value.address}
              </p>
            )}
            {value.rating != null && (
              <p className="legend mt-1 text-[var(--color-deep)]">
                {value.rating.toFixed(1)} ★
              </p>
            )}
            {value.lat == null && (
              <p className="legend mt-1 text-[var(--color-mute)]">
                no coordinates · won&rsquo;t show on the map
              </p>
            )}
          </div>
          <button
            type="button"
            className="pixel-btn legend shrink-0 px-2 py-1"
            onClick={() => onChange(null)}
          >
            change
          </button>
        </div>
      </div>
    )
  }

  // No Maps key: still let a place be named, just without coordinates.
  if (!HAS_MAPS) {
    return (
      <label className="block space-y-1.5">
        <span className="legend">where</span>
        <input
          className="pixel-input"
          placeholder="type a place name"
          onBlur={(e) => {
            const name = e.target.value.trim()
            if (name) {
              onChange({
                name,
                address: '',
                lat: null,
                lng: null,
                placeId: null,
                photoUrl: null,
                rating: null,
              })
            }
          }}
        />
        <span className="legend block text-[var(--color-mute)]">
          add a maps key to search real places
        </span>
      </label>
    )
  }

  return (
    <div className="space-y-1.5">
      <label className="block space-y-1.5">
        <span className="legend">where</span>
        <input
          className="pixel-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search for a place"
          autoComplete="off"
        />
      </label>

      <div aria-live="polite">
        {busy && <p className="legend text-[var(--color-ink)]/60">looking…</p>}
        {failed && (
          <p className="legend text-[var(--color-deep)]">
            Place search isn&rsquo;t responding. Check the key&rsquo;s restrictions.
          </p>
        )}
      </div>

      {results.length > 0 && (
        <ul className="space-y-1">
          {results.map((s, i) => (
            <li key={s.placePrediction?.placeId ?? i}>
              <button
                type="button"
                className="pixel-btn w-full px-2 py-2 text-left"
                onClick={() => void pick(s)}
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
