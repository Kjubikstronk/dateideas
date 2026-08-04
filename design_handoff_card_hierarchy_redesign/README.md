# Handoff: Visual hierarchy redesign — date planner

## Overview
Targeted visual redesign of the existing app (repo `Kjubikstronk/dateideas`, `src/`). Same Y2K-handheld design language (ink/paper/hot-pink/lavender/aqua palette, 3px ink borders, flat offset shadows, Pixelify Sans / Space Grotesk / Silkscreen) — this is not a new visual system, it's fixing hierarchy, card-action noise, empty-state consistency, colour usage, and desktop cohesion within that language.

## About the design files
`critique_and_mockups.dc.html` is a **design reference**, not code to copy in. It's a static HTML mockup (inline styles, no React) showing the current UI recreated from the real source, followed by the critique and the proposed redesign at both 375px and desktop widths. Implement the changes described below directly in the existing React/Tailwind components — do not port the HTML.

## Fidelity
High-fidelity for colour, type, spacing and the specific elements changed. Anything not mentioned below (map behavior, calendar swipe gesture, edit sheet, auth, weather, data model) is unchanged — do not touch it.

## Changes to implement

### 1. New surface tier: flat rows vs. raised cards
Currently every list entry uses `.pixel-box-sm` (3px ink border + shadow) regardless of state — see `src/components/DateCard.tsx`'s root `<li>` className. Add two new treatments:
- **Flat row** (collapsed/idle card in a list, not the day panel's single entry): no border, no shadow, sits directly on the paper background (`--color-paper`), separated from the next row by a 1px hairline at `rgba(26,16,51,0.2)` (ink at 20%). Padding stays similar to today (`p-3`/12px) but tighten vertical rhythm since there's no box: ~10px vertical padding.
- **Raised card** (the one entry the user is actively interacting with — e.g. selected in the day panel, or expanded to show an action sheet): keep today's `.pixel-box-sm`, unchanged.
Apply flat rows in `AgendaPane`'s `Section` list items (`src/screens/Home.tsx`) when `mode === 'idle'` and the card isn't the one under interaction; keep `pixel-box-sm` for `DayPanel`'s single-day entries (already effectively "the one card in focus" since there's only ever one context at a time there).
Reserve the heaviest shadow (`6px 6px 0`, currently only the device bezel in `Device.tsx`) as-is — don't add it anywhere else; it should stay the single loudest thing on any screen.

### 2. Collapse card actions to one primary + overflow
In `DateCard.tsx`'s idle-mode action row: replace the full button row (edit / we went-or-call-it-off / delete, up to 4 buttons) with:
- One `pixel-btn-primary` button for the single primary action already computed today (isPast ? "we went" : nothing if planned-and-future; "how was it?"/"change yours" for done items). If there's no primary action (e.g. a future planned date with nothing to report), show nothing here.
- One 44×44px `⋯` button (`aria-label="more actions"`) that opens a bottom sheet — reuse the existing sheet component/pattern from `EditSheet.tsx` (same slide-up, same `.sheet` class, same backdrop). Sheet contents, in order: edit, call it off / back on (status-dependent, same logic as today), delete (still requires the existing confirm step — keep `mode === 'deleting'`'s confirmation, just triggered from inside the sheet instead of inline).
No new visual pattern — this is `EditSheet`'s sheet, invoked a second time with different content.

### 3. Fix the one inconsistent empty state
In `DayPanel` (`src/screens/Home.tsx`), the "Pick a day to see what's on it." state already has a `PixelHeart outline` — good, keep. The **entries.length === 0** case ("Nothing here yet.") currently has no glyph. Add `<PixelHeart size={24} color="var(--color-lav)" outline />` above it, matching the other three empty states in the file, and change the copy to "Nothing here yet — pick a day with something on it, or add one." (matches the voice of the other three).

### 4. Extend pin colours into the agenda section headers
In `Section` (`src/screens/Home.tsx`), replace the plain count badge for "someday" and "been there" headings with a small `PixelHeart`:
- "someday" → `<PixelHeart size={14} color="var(--color-lav)" outline bordered />` before the heading text, count badge removed.
- "been there" → `<PixelHeart size={14} color="var(--color-aqua)" bordered />` before the heading text, count badge removed.
- "next up" keeps its existing hot-pink countdown badge (already correctly colour-matched to `planned`).
- "how did it go?" gets no glyph (it's the action-required section, no single status colour applies).
This reuses `pinColor()` from `src/components/DateMap.tsx` — pass the same status values through, don't hardcode new hex.

### 5. Unify the desktop three-pane layout
In `Home.tsx`'s `isWide` branch: add a single header strip above the three panes (`height: ~48px`, `background: var(--color-card)`, `border-bottom: 3px solid var(--color-ink)`), containing:
- Left: a couple nameplate in Pixelify Sans, bold, ~16px — see item 6 for the data source.
- Right: a lifetime stat in `.legend` styling, e.g. "14 dates · since 2023" (count of items with `status: 'done'`, and earliest `createdAt` or a stored anniversary date — confirm which with data model).
Also widen the ideas pane from `w-64` (256px) to roughly `w-80` (320px) so cards aren't narrower there than on a 375px phone.

### 6. Couple nameplate, not just an email
Add an editable "nameplate" string (e.g. "Mina & Jules") — likely a new field on the couple/membership document, editable from a settings surface (none currently exists per the read source; simplest option is inline-editable text in the new desktop header strip and, on mobile, above `SignOut` in `AgendaPane`). Keep the existing sign-out email display as-is; the nameplate supplements it, doesn't replace it. Use Pixelify Sans bold for the nameplate text.

### 7. Weather badges shouldn't compete with the status heart
`DateCard.tsx`'s forecast badge currently fills with `--color-hot` (hot) or `--color-aqua` (cold) — the same two colours the status `PixelHeart` uses for "done" and "planned." On a done+hot card both read pink/aqua at once and blur together. Change the weather badge to a muted outline treatment instead of a fill: `border: 2px solid var(--color-ink)`, `background: transparent`, text in `--color-deep)` for hot / `--color-ink)/70` for cold — keep the sky emoji as the only colour-carrying element there, so temperature never competes with status colour.

### 8. Put the countdown on the card itself, not just the section header
`agenda.countdown` (`src/screens/Home.tsx`) is computed only for `upcoming[0]` and shown once on the "next up" heading. Compute the same `differenceInCalendarDays` per-card in `DateCard.tsx` and show it next to the date line — `.legend` styling, `var(--color-deep)` — but **only** on the single soonest upcoming card (the same one the header badge already describes), so it doesn't turn into a countdown on every future card.

### 9. Shrink cancelled cards, don't just fade them
Once actions collapse to one primary + overflow (item 2), a cancelled card has no primary action — "back on" moves into the overflow sheet along with everything else, so the primary slot is empty. Rather than leaving that gap, deliberately reduce a cancelled card's presence: drop padding from `p-3` (12px) to ~8px, drop the title from `text-base` to `text-sm`, keep the existing 60%-opacity/strikethrough. It should visually recede as a group, not just grey out at full size.

### 10. Let "someday" cards pick a day inline
Someday cards (`item.scheduledFor == null`) have no way to schedule from the list — today it's edit → pick a day → save. Add a lightweight inline affordance on someday cards specifically: a small "pick a day" button that opens *just* a date field (not the full `EditSheet`), writing directly via `onUpdate(item.id, { scheduledFor })`. This is a flow change, not just visual — flag for scope/estimate before building; not required for items 1–6 above to ship.

## Design tokens (unchanged, for reference)
- Colors: ink `#1A1033`, paper `#FFE5F1`, card `#FFFDFE`, hot pink `#FF5CA8` (fills/borders only, fails contrast as text), deep pink `#B31E67` (use for pink text), lavender `#B8A6FF`, aqua `#5BE0E6`, muted `#6B6480`.
- Borders: 3px ink, `border-radius: 0` everywhere.
- Shadows: card `4px 4px 0 ink`, device bezel `6px 6px 0 ink` (reserve for bezel + FAB only), new flat rows: none.
- Type: Pixelify Sans (headings/numbers/buttons), Space Grotesk (prose), Silkscreen (`.legend`, uppercase, ~10-11px, letter-spacing ~0.06em).
- Motion: `steps()` easing only, no smooth curves.

## Hard constraints — do not violate
- Mobile-first, 375px primary. Touch targets ≥44px (the `⋯` overflow button and every sheet row must hit this). Inputs ≥16px.
- Hot pink is fills/borders only, never text — badge fills above are fine, badge text stays ink or deep pink.
- Category/weather icons stay emoji — no new custom icons.
- Google Map colours untouched.

## Files
- `critique_and_mockups.dc.html` — full critique + before/after mockups (design reference only).
- Real source touched: `src/screens/Home.tsx`, `src/components/DateCard.tsx`, `src/components/Calendar.tsx` (no changes needed there, referenced for grid styling only), `src/components/DateMap.tsx` (`pinColor()` reused, no changes), `src/components/EditSheet.tsx` (sheet pattern reused, no changes), `src/theme.css` (may need two new utility classes: `.row-flat`, `.row-active` — or just apply the flat/raised styles via existing Tailwind arbitrary values, developer's call).
