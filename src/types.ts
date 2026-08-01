export type Place = {
  name: string
  address: string
  /** Null when the place was typed by hand rather than picked from Places —
      it still shows everywhere it's named, it just can't be pinned. */
  lat: number | null
  lng: number | null
  placeId: string | null
  photoUrl: string | null
  rating: number | null
}

/** A place that can actually be drawn on the map. */
export const hasCoords = (
  p: Place | null,
): p is Place & { lat: number; lng: number } =>
  !!p && typeof p.lat === 'number' && typeof p.lng === 'number'

/**
 * `idea`      somewhere we want to go, no day picked
 * `planned`   on the calendar
 * `done`      we went
 * `cancelled` we didn't go
 *
 * Cancelling is not deleting. A called-off date stays on the calendar, greyed
 * and struck through, with the reason attached — that's a small piece of your
 * history and it's often the funnier one. Deleting is for records that should
 * never have existed.
 */
export type DateStatus = 'idea' | 'planned' | 'done' | 'cancelled'

/** How a date actually went, according to one person. */
export type Memory = {
  note: string
  /** 1–5. Zero means they wrote something without rating it. */
  stars: number
  at: number
}

/**
 * One record covers an idea's whole life — jotted down, scheduled, then lived.
 * The map and the calendar are two views of this single collection rather than
 * two features that have to be kept in step.
 */
export type DateIdea = {
  id: string
  /**
   * Which couple this belongs to. The rules compare it against yours, so two
   * couples share one deployment without ever seeing each other's dates.
   * Optional only because records written before couples existed lack it.
   */
  coupleId?: string
  title: string
  note: string
  /** Shown at full size in lists and detail; the dense calendar grid uses
      status-coloured pixel hearts instead, which carry more information. */
  emoji: string
  place: Place | null

  /**
   * A calendar day as `yyyy-MM-dd`, NOT a timestamp.
   *
   * A date night is a day, not an instant. Storing a Timestamp means the same
   * record can render as Friday for one of you and Saturday for the other the
   * moment either of you travels or the clocks shift. A plain date string
   * cannot drift.
   */
  scheduledFor: string | null
  /** Optional `HH:mm`, kept separate so the day stays timezone-proof. */
  time: string | null

  status: DateStatus
  /** Why it didn't happen. Optional — sometimes there's no story. */
  cancelReason: string | null

  /**
   * One memory per person, keyed by uid.
   *
   * A single shared memory meant whoever answered first answered for both,
   * and the other was never asked. Keying by uid also lets the rules stop
   * either of you editing the other's — which is what makes rating blind
   * and then revealing actually mean something.
   */
  memories: Record<string, Memory> | null

  /** @deprecated Superseded by `memories`. Read for old records, never written. */
  memory?: Memory | null
  createdBy: string
  createdAt: number
}

export type DateDraft = Omit<DateIdea, 'id' | 'createdBy' | 'createdAt'>

/** Every memory on a date, folding in any written before they were per-person. */
export function memoriesOf(item: DateIdea): Record<string, Memory> {
  const current = item.memories ?? {}
  if (item.memory && !Object.keys(current).length) {
    // A pre-existing shared memory belongs to whoever created the date.
    return { [item.createdBy]: item.memory }
  }
  return current
}

/** The average rating, ignoring anyone who wrote without rating. */
export function averageStars(item: DateIdea): number | null {
  const scored = Object.values(memoriesOf(item))
    .map((m) => m.stars)
    .filter((n) => n > 0)
  if (!scored.length) return null
  return scored.reduce((a, b) => a + b, 0) / scored.length
}

/** A date whose place is pinnable. Narrowing here keeps the map free of
    non-null assertions. */
export type PlacedDate = DateIdea & { place: Place & { lat: number; lng: number } }

export const placedOnly = (items: DateIdea[]): PlacedDate[] =>
  items.filter((i): i is PlacedDate => hasCoords(i.place))
