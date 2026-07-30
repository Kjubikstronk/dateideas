import { useEffect, useState } from 'react'

/**
 * Picks the layout in JS rather than with `hidden lg:flex`.
 *
 * CSS-hiding the layout you aren't using still mounts it: both trees run their
 * effects, and the map would instantiate twice — which Google bills per load.
 * Rendering one branch means one map, ever.
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Matches the `lg` breakpoint the rest of the app uses. */
export const useIsWide = () => useMediaQuery('(min-width: 1024px)')
