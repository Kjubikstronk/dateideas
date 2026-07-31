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

/**
 * The three-pane console needs real width: a 26rem calendar plus an 18rem
 * ideas column leaves under 300px for the map at 1024, which is uselessly
 * narrow. Below this we use the phone layout, which is fully functional.
 */
export const useIsWide = () => useMediaQuery('(min-width: 1280px)')

/**
 * True only for a real pointer. Touchscreens synthesise mouse events, so
 * without this a finger dragging past a card fires mouseenter, sets state, and
 * re-renders the whole app mid-scroll — which is what made scrolling stutter.
 * Hover-linking has no meaning on a touchscreen anyway.
 */
export const useHasHover = () => useMediaQuery('(hover: hover) and (pointer: fine)')
