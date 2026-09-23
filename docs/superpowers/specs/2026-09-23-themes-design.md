# Themes — a picked set, starting with Halloween

**Status:** design approved, not implemented
**Date:** 2026-09-23

## Decisions already made

| Question | Answer |
| --- | --- |
| Shape | A small fixed set you pick from. Not automatic, not a full theme engine. |
| Whose choice | Per-person, in `localStorage`. No Firestore, no rules change, works offline. |
| Halloween's mode | Dark. Chosen knowing it costs more than a light palette swap. |
| What a theme carries | A palette **and a glyph**. Halloween replaces the heart with a pumpkin. |

The glyph swap is the reason this is worth building. Changing one grid turns
the map pins, the calendar markers, the rating stars and every empty state into
pumpkins at once. A recolour alone would not earn the work.

## Phase 1 — split `--color-ink`

`--color-ink` currently does three jobs that only coincide in light mode.
Counted across `src`:

| Job | Uses |
| --- | --- |
| Body text and its `/60` `/45` opacity variants | 46 |
| Borders | 36 |
| Hard offset shadows | 13 |
| Fills | 1 |

Those four categories cover 96 of **104** total `var(--color-ink)` occurrences.
The table is not exhaustive: the remaining eight are outlines, `::selection`,
CSS-level `color:` declarations and the default passed inside `PixelHeart`.
Every one needs classifying by hand — do not treat the categories above as a
complete find-and-replace.

Plus four hardcoded `rgb(26 16 51 / …)` values that escaped tokenisation
entirely — two in `theme.css` insets, one in the sheet backdrop, one in
`DateCard`.

In light mode a single dark token serves all three. In dark mode they diverge:
text must go light, borders want to be visible against a dark ground, and
shadows want to stay dark or become an accent. So:

- `--color-line` — borders, fills
- `--color-text` — body copy and its opacity variants
- `--color-shadow` — hard offset shadows

**The safety property:** in the pink theme all three keep `#1A1033`, so this
refactor is visually a no-op. It can land, be proven pixel-identical, and ship
on its own before any theme exists. That is the point of doing it first — the
risky mechanical change is separated from the visible new feature.

`--color-ink` is removed rather than kept as an alias. An alias would let new
code keep using the ambiguous token and silently break the next theme.

## Phase 2 — plumbing and the picker

Themes apply through `data-theme` on `<html>`. Tailwind v4 emits its `@theme`
tokens onto `:root`; a `[data-theme="…"]` block overrides them at runtime. This
works because components reference `var(--color-*)` rather than build-time
hexes — confirmed by reading the compiled CSS, not assumed.

- `src/lib/theme.ts` — the theme registry: id, display name, token overrides,
  glyph grid. Pure data plus a `readTheme()` / `writeTheme()` pair wrapping
  `localStorage` in `try/catch`.
- The stored value is validated against the registry on read. An unknown id —
  a theme removed in a later version, a corrupted value — falls back to `pink`
  rather than leaving the app unstyled.
- Applied before first paint by a tiny inline script in `index.html`, the same
  way theme switchers avoid a flash of the wrong palette. React reads the same
  value on mount.
- **Picker:** bottom of the *all dates* tab beside `leave`. One 44px swatch per
  theme, current one marked. No menu, no settings screen.

Phase 2 ships with `pink` as the only registered theme. Nothing looks different;
the machinery is provably in place.

## Phase 3 — Halloween

### The token contract

Each theme must satisfy the **roles**, not copy the pink values:

| Token | Role |
| --- | --- |
| `paper` | the world behind the device |
| `card` | surfaces holding content |
| `line` | borders and fills |
| `text` | body copy; must clear 4.5:1 on `card` and on `paper` |
| `shadow` | hard offset shadows, no blur, ever |
| `hot` | the loud accent — fills and borders |
| `deep` | **the sibling of `hot` that is safe as text.** Not "the darker one". |
| `lav` / `aqua` / `mute` | someday / been there / called off — mutually distinguishable, and each readable as text where used |

The `deep` definition matters more than it looks. "Hot pink is fills only
because it fails contrast as text" is a **light-mode** fact. On a dark ground
the vivid accent passes comfortably and a dark sibling is what fails — the
relationship inverts. Writing the rule by role rather than by lightness is what
lets a dark theme exist without contradicting `CLAUDE.md`.

### Starting values

These are a starting point for the contrast gate, **not verified**:

```
paper   #120A20   near-black purple
card    #241539   dark purple
line    #F2E9DC   bone
text    #F2E9DC   bone
shadow  #FF7518   pumpkin — the offset shadow glows instead of darkening
hot     #FF7518   pumpkin
deep    #FFA05C   lighter pumpkin, the text-safe sibling
lav     #B388FF   witch purple (someday)
aqua    #7CFC5A   slime green (been there)
mute    #8A7FA3   (called off)
```

Any value may move. The gate is the script, not my eye.

### The inset problem

`.screen` and `.pixel-input` fake a recess with an **inset** shadow that
darkens the top-left. On a dark surface, darkening reads as a *bulge* rather
than a recess — the effect inverts without looking obviously broken. Both need
per-theme inset values: a light inset on dark themes. This is the single most
likely thing to ship subtly wrong, so it gets looked at directly rather than
assumed to follow from the palette.

### The pumpkin

Designed on its own grid, not derived from the heart. It must survive **8px**,
because the calendar markers are 8px and that is where pixel shapes fail.
Verified by rasterising it to a canvas and reading the pixels back — the same
test that correctly rejected an 11-wide heart whose extra detail vanished at
that size, and which was right when visual judgement was not.

`PixelHeart` gains a theme-aware grid rather than being renamed, keeping the
diff small. Its `bordered`, `outline` and `size` props are unchanged.

## What cannot be themed

- **The installed home-screen icon.** It is a baked PNG that iOS snapshots at
  install time and never re-reads. A Halloween user gets pumpkins throughout
  the app and a pink heart on their home screen. There is no fix.
- **The favicon** *can* be regenerated per theme and swapped at runtime via the
  `<link rel="icon">` href. Worth doing; it is the one icon surface that can
  follow the theme.
- **Google's map tiles**, which stay untouched per the existing constraint.

## Verification

- **Phase 1 is pixel-identical or it is wrong.** Screenshot the calendar, map
  and agenda before and after the split and compare. Any visible difference is
  a bug in the refactor, not a design choice.
- **Contrast is a gate, not a review.** `scripts/check-contrast.mjs` is extended
  to take a theme and run every pairing the UI actually uses, including the
  `/60` and `/45` opacity variants. Every theme must pass AA before it is
  registered. A failing theme does not ship with a note; it does not ship.
- **The pumpkin is rasterised at 8, 11, 14 and 24px** and inspected as pixels
  before being accepted.
- **The dark theme is walked at 375px** across all three tabs plus both sheets,
  specifically looking at the insets, the sheet backdrop, and the `disabled`
  button state, whose `opacity: 0.45` behaves differently on a dark ground.
- **Impeccable detector** clean on every changed file.

## Edge cases

- `localStorage` unavailable or throwing — falls back to `pink`, silently.
- Stored id not in the registry — falls back to `pink`.
- Theme changes while a `<dialog>` is open — tokens are CSS variables, so the
  sheet restyles in place. No remount, nothing to handle.
- Preview mode — reads the same registry, so themes are exercisable without
  Firebase.

## Out of scope

Custom or user-defined colours. Automatic or seasonal switching. Syncing the
choice between partners. Per-theme fonts, sounds, or copy. More than two themes
in this piece of work.
