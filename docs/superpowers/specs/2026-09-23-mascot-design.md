# The heart, awake — a mascot for *our dates*

**Status:** design approved, not implemented
**Date:** 2026-09-23

## Why

The app is a Y2K handheld. A handheld with a creature living on it is the most
on-brand thing it could possibly grow, and the pixel heart is already the app's
universal mark — favicon, map pins, rating stars, empty states.

The brief was "tamagotchi shit, without being super duper annoying". Those pull
against each other, and the resolution is the load-bearing decision in this
document: **the mascot has no care loop. Its food is your actual dates.** You
never feed it, never clean up after it, and it can never die. Its mood is
derived entirely from data the agenda already computes, so it reflects your
relationship instead of competing with it for attention.

## What it is

The existing `PixelHeart` glyph with a face punched into it in ink.

It is not a new character and it does not appear anywhere else. Map pins,
rating stars, calendar markers and empty states keep the plain faceless mark.
The face exists in exactly one place — the device bezel — which is what stops
it becoming clutter.

## Moods

Five. Each differs in the **shape** of its eyes, not the number of pixels,
because that is what stays legible at bezel size.

| Mood | Face | Condition |
| --- | --- | --- |
| `excited` | wide eyes, open mouth, aqua spark | a date today or tomorrow |
| `curious` | one eye raised, small `o` mouth | a past date nobody has rated |
| `content` | dot eyes, `V` smile | something planned, further out |
| `bored` | lidded eyes, flat mouth | ideas on the wishlist, nothing scheduled |
| `asleep` | closed eyes, lavender `zzz` | nothing planned and no ideas |

Resolved in that order, first match wins:

```
excited   agenda.countdown === 'today' || agenda.countdown === 'tomorrow'
curious   agenda.unanswered.length > 0
content   agenda.upcoming.length > 0
bored     agenda.someday.length > 0
asleep    otherwise
```

`excited` deliberately outranks `curious`: anticipation is the better feeling,
and the agenda already puts "how did it go?" at the top of the list, so the
unrated date is not being hidden.

Before data arrives — the login screen, the setup screen, the first moment
after sign-in — the mood is `null` and the bezel renders **today's plain,
faceless heart**. Nothing flickers, and the login screen does not get a pet.

## Rules it must never break

These are the whole reason the feature is safe. They belong in `CLAUDE.md`
alongside the other design constraints.

- **It never speaks.** No speech bubbles, no text coming out of it, ever.
- **It never blocks.** The only modal it may open is the one-time what's-new
  window below, and the status window the user opens deliberately.
- **It never notifies.**
- **No decay and no guilt.** There is no "you haven't been on a date in 30
  days" state. `bored` is the most negative it is permitted to get, and bored
  is funny rather than accusing.
- **It is never the only signal.** Every mood corresponds to something the
  agenda already says in words. The mascot is a second, faster read of
  information that is never only there.

## The bezel

Measured at 375px: the header is 335px wide, the title block takes 117px, the
`bug?` button 58×43px, leaving **159px of slack**.

`bug?` is 58px of prime bezel for a control used twice a year, so it moves. Its
new home is the bottom of the **all dates** tab, beside the existing `leave`
button — that corner is already where the app keeps its settings-shaped things.

The bezel becomes:

```
[ heart · our dates ] ················· [ mascot ]
```

The mascot renders at 30px with a **44px transparent tap pad**, absolutely
positioned so it never changes the header's layout box — the same technique
already used for the shrunken map pins.

`excited` is the one mood that may carry the existing `.beat` animation.
Every other mood is still. `prefers-reduced-motion` already neutralises `.beat`
globally, so no extra handling is needed.

## The what's-new window

Shown **automatically, once**, the first time the app opens after this ships,
so neither couple misses it. It is also the mascot's permanent status screen:
tapping the mascot reopens the same component with the current mood marked.

**Framing: this is a release moment, not a help screen.** It should feel like
a handheld shipping new firmware — the device announcing something about
itself — rather than a product changelog or a tooltip tour. Built on the
existing `.sheet` primitive that `EditSheet` and `ReportSheet` already use, so
focus trapping, Escape-to-close and page inertness stay the browser's job.

**Copy.** Lowercase and terse, in the app's existing voice:

- eyebrow, in `.legend`: `FIRMWARE UPDATE`
- title: **your heart woke up**
- body: "it lives on the case now. it doesn't want feeding — it just goes by
  what's in your diary."
- then the mood rows
- dismiss: `got it`

**Mood rows.** The real pixel face at 28px beside its line. This copy is the
spec; the implementer should not invent alternatives:

| Face | Line |
| --- | --- |
| `excited` | it's nearly time |
| `curious` | one of you hasn't said how it went |
| `content` | there's something in the diary |
| `bored` | ideas, but no day picked for any of them |
| `asleep` | nothing planned, nothing on the wishlist |

Paging it like a game manual would be overkill for five rows; one scrollable
sheet is enough.

**When it fires:** from an effect in `Home`, on the first render where
`loading === false` and `membership.state === 'ready'`. Never on the login,
setup, or unassigned screens. Gating on loaded data rather than on a timer
also means the mood it opens with is the real one, and in practice a Firestore
round-trip outlasts the 340ms boot sequence, so the two never collide.

**How it remembers:** a version-keyed `localStorage` flag, `dateideas:met-heart`.
Version-keyed so a future mascot change can reintroduce it deliberately. Reads
and writes are wrapped in `try/catch` — private mode throws on access, and the
failure mode is simply that the window shows again, which is harmless.

## Components

| File | Responsibility |
| --- | --- |
| `src/lib/mascot.ts` | `Mood` type, `moodFor(agenda)`, the face pixel maps, the one-line copy per mood. Pure — no hooks, no imports from components. |
| `src/lib/mascot-context.tsx` | A tiny provider holding the current mood. Exists only to cross the layout boundary described below. |
| `src/components/PixelHeart.tsx` | Gains one optional `face?: [number, number][]` prop, rendered in ink over the body. Unchanged when omitted. |
| `src/components/MascotHeart.tsx` | The bezel control: reads the mood, renders the face, owns the 44px tap pad and the accessible label, opens the sheet. |
| `src/components/MascotSheet.tsx` | The what's-new / status window. Takes `openRequest` and the current mood, exactly like the existing sheets. |

### Why a context

`Device` renders the bezel, and `Home` is its child — but `Home` is the only
component with the data, because it owns the single `useDates()` subscription.
Calling `useDates()` again higher up would open a second Firestore listener,
which is the thing the data layer is carefully built to avoid.

So `App` provides the context, `Home` pushes its computed mood into it, and the
bezel reads it. About thirty lines, and it keeps the one-listener property
intact.

## Data flow

```
useDates() → agenda (Home, already computed)
           → moodFor(agenda) → setMood() → MascotContext
                                         → MascotHeart (bezel)
                                         → MascotSheet (current mood marked)
```

No new Firestore fields. No new reads or writes. No timers. The mascot has no
state of its own beyond "has this browser seen the intro".

## Edge cases

- **No data yet / signed out / not in a couple** — mood is `null`, plain heart,
  no sheet.
- **`localStorage` unavailable** — the intro may show more than once. Accepted.
- **Both partners** — each browser has its own `met-heart` flag. Correct: it is
  a per-person introduction, not a shared one.
- **Preview mode** — runs off `SAMPLE_DATES` through the identical path, so the
  mascot is fully exercisable without Firebase.

## Verification

- **Unit:** `moodFor()` against every branch, including the precedence between
  `excited` and `curious`, and the `null` case.
- **Browser, at 375px:** tap pad measures ≥44×44; the face's ink on hot pink
  clears WCAG AA (the same pairing `.pixel-btn-primary` already uses); the
  sheet moves focus inside on open; the header does not reflow or wrap when the
  mascot is present.
- **Behavioural:** drive the preview fixture through each condition and confirm
  the rendered face changes, rather than asserting on the class list.
- **Detector:** Impeccable clean on every changed file.

## Out of scope

No naming or customising the pet. No decay, hunger, or health. No mascot
outside the bezel. No new Firestore fields. No notifications. No sound.
