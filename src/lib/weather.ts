import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { placedOnly, type DateIdea } from '../types'

/**
 * Weather for upcoming dates, from Open-Meteo.
 *
 * No API key, no billing, no account — which is the whole reason it's this
 * service and not Google's. Forecasts only run about 16 days out, so anything
 * further away simply has no weather and shows none.
 *
 * Every location goes in one batched request rather than one per date: the API
 * takes comma-separated coordinates and answers with an array in the same
 * order.
 */

export type Sky = 'clear' | 'cloud' | 'rain' | 'snow' | 'storm' | 'fog'

export type Forecast = {
  sky: Sky
  /** Daily maximum, °C. */
  high: number
}

/**
 * Emoji rather than hand-drawn pixel glyphs.
 *
 * These are instantly readable at any size, need no licence check, and match
 * the emoji already used for stickers. Drawing a bespoke set would have meant
 * either my own mediocre pixel art or auditing the licence on someone else's.
 */
export const SKY_EMOJI: Record<Sky, string> = {
  clear: '☀️',
  cloud: '⛅',
  rain: '🌧️',
  snow: '❄️',
  storm: '⛈️',
  fog: '🌫️',
}

/** WMO weather codes, collapsed to the six we show. */
function skyFromCode(code: number): Sky {
  if (code >= 95) return 'storm'
  if (code >= 85) return 'snow'
  if (code >= 80) return 'rain'
  if (code >= 71 && code <= 77) return 'snow'
  if (code >= 51 && code <= 67) return 'rain'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 1 && code <= 3) return 'cloud'
  return 'clear'
}

/** Above this, the forecast is worth flagging rather than just showing. */
export const HOT_C = 30
export const FREEZING_C = 0

const FORECAST_DAYS = 16
const ENDPOINT = 'https://api.open-meteo.com/v1/forecast'

export function useWeather(items: DateIdea[]) {
  /** One entry per distinct place with an upcoming, in-range date. */
  const wanted = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const horizon = format(
      new Date(Date.now() + FORECAST_DAYS * 86_400_000),
      'yyyy-MM-dd',
    )

    const byPlace = new globalThis.Map<string, { lat: number; lng: number; days: Set<string> }>()
    for (const item of placedOnly(items)) {
      const day = item.scheduledFor
      if (!day || day < today || day > horizon) continue
      if (item.status === 'cancelled' || item.status === 'done') continue

      const key = `${item.place.lat.toFixed(3)},${item.place.lng.toFixed(3)}`
      const entry = byPlace.get(key)
      if (entry) entry.days.add(day)
      else byPlace.set(key, { lat: item.place.lat, lng: item.place.lng, days: new Set([day]) })
    }
    return [...byPlace.entries()]
  }, [items])

  const [forecasts, setForecasts] = useState<Record<string, Forecast>>({})

  // Keyed on the coordinates so this refetches when the set of places changes,
  // not on every render.
  const signature = wanted.map(([k]) => k).join('|')

  useEffect(() => {
    if (!wanted.length) {
      setForecasts({})
      return
    }

    let cancelled = false
    const url =
      `${ENDPOINT}?latitude=${wanted.map(([, w]) => w.lat).join(',')}` +
      `&longitude=${wanted.map(([, w]) => w.lng).join(',')}` +
      `&daily=weather_code,temperature_2m_max&forecast_days=${FORECAST_DAYS}&timezone=auto`

    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        if (cancelled) return
        // One location comes back as an object, several as an array.
        const list = Array.isArray(data) ? data : [data]
        const next: Record<string, Forecast> = {}

        list.forEach((place, i) => {
          const key = wanted[i]?.[0]
          const daily = place?.daily
          if (!key || !daily?.time) return
          daily.time.forEach((day: string, d: number) => {
            next[`${key}@${day}`] = {
              sky: skyFromCode(daily.weather_code[d]),
              high: Math.round(daily.temperature_2m_max[d]),
            }
          })
        })
        setForecasts(next)
      })
      // Weather is decoration on top of a planner. If it fails, the app simply
      // shows none rather than complaining about it.
      .catch(() => {
        if (!cancelled) setForecasts({})
      })

    return () => {
      cancelled = true
    }
  }, [signature]) // eslint-disable-line react-hooks/exhaustive-deps

  /** The forecast for a specific date, or null if there isn't one. */
  return useMemo(() => {
    const lookup: Record<string, Forecast> = {}
    for (const item of placedOnly(items)) {
      if (!item.scheduledFor) continue
      const key = `${item.place.lat.toFixed(3)},${item.place.lng.toFixed(3)}@${item.scheduledFor}`
      const hit = forecasts[key]
      if (hit) lookup[item.id] = hit
    }
    return lookup
  }, [items, forecasts])
}
