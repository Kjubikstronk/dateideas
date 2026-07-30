import type { ReactNode } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { HAS_MAPS, MAPS_API_KEY } from '../lib/maps'

/**
 * One Maps API load for the whole app.
 *
 * This sits above both the map and the place search on purpose: they each need
 * the SDK, and mounting a provider per consumer loads (and bills for) the
 * script more than once. Hoisting it also means the `places` library is already
 * warm by the time you open the editor.
 */
export default function MapsProvider({ children }: { children: ReactNode }) {
  if (!HAS_MAPS) return <>{children}</>

  return (
    <APIProvider apiKey={MAPS_API_KEY} libraries={['places', 'marker']}>
      {children}
    </APIProvider>
  )
}
