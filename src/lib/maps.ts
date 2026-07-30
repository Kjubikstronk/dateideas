export const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
export const MAPS_MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || ''

/** Whether Google Maps is available at all. Both the map and the place search
    degrade to no-key alternatives when this is false. */
export const HAS_MAPS = Boolean(MAPS_API_KEY)

/** Id the map registers under, so anything inside APIProvider can reach it. */
export const MAP_INSTANCE_ID = 'date-map'

type Box = { north: number; south: number; east: number; west: number }

const STORE_KEY = 'dateideas:last-viewport'

/**
 * Where the map was last looking.
 *
 * Place search is biased to this so results are local — searching "cafe" in
 * Vienna shouldn't lead with Ohio. It's remembered rather than read live for
 * two reasons: on a phone the map is a separate tab and often isn't mounted
 * when you open the editor, and after a reload the very first search would
 * otherwise be unbiased.
 */
let remembered: Box | null = (() => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null')
  } catch {
    return null
  }
})()

export function rememberViewport(bounds: google.maps.LatLngBounds | null | undefined) {
  if (!bounds) return
  remembered = bounds.toJSON()
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(remembered))
  } catch {
    // Private mode, quota, whatever — biasing is a nicety, not a requirement.
  }
}

export const lastViewport = () => remembered
