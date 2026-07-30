import { HAS_MAPS } from '../lib/maps'
import { usePlaceSearch } from '../lib/places'
import type { Place } from '../types'

type Props = {
  value: Place | null
  onChange: (place: Place | null) => void
}

/**
 * Venue search inside the editor. The map has its own search bar; both run on
 * the same `usePlaceSearch` hook so billing behaviour and result shape stay
 * identical between them.
 */
export default function PlacePicker({ value, onChange }: Props) {
  const { query, setQuery, results, busy, failed, choose } = usePlaceSearch()

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
                onClick={async () => {
                  const picked = await choose(s)
                  if (picked) onChange(picked)
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
