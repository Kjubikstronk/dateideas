export const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
export const MAPS_MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || ''

/** Whether Google Maps is available at all. Both the map and the place search
    degrade to no-key alternatives when this is false. */
export const HAS_MAPS = Boolean(MAPS_API_KEY)
