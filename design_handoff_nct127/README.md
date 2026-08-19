# Handoff: NCT 127 fan site (neo-futurist)

## Overview
An auto-updating NCT 127 fan site. It is a sibling of the user's existing
`taemin.online` project ([Kjubikstronk/press-it](https://github.com/Kjubikstronk/press-it)) —
same architecture, same type system, same zero-radius/hairline discipline — but reskinned
from press-it's monochrome-plus-red into a neon, neo-futurist scheme.

It is a single scrolling page: latest album, live countdown, news wire, the current
lineup (which changes and must stay current), the tour, discography, videos, news,
timeline, and fan facts.

## About the Design Files
The file in this bundle is a **design reference created in HTML** — a prototype showing
intended look and behaviour, not production code to copy directly. The task is to
**recreate this design in the target codebase's environment** using its established
patterns. In this case the target environment already exists and is known: `press-it` is
plain static HTML + CSS + vanilla ES modules, with a Node `build.js` that writes a
`data/site.json` the page reads at runtime. Rebuild this design the same way — an
`index.html`, an `assets/css/style.css`, an `assets/js/app.js`, and a `build.js` — not as
a framework app.

`NCT 127.dc.html` is a component-format file. Read it for structure, copy, and exact
values; do not ship it.

## Fidelity
**High fidelity.** Colours, typography, spacing, motion and copy are final. Recreate
pixel-perfectly. The one deliberate exception: every image is a placeholder (see Assets).

---

## Architecture to mirror from press-it

Two rules carried over from `press-it/assets/css/style.css`, and they are load-bearing:

1. **No media queries for layout.** Every size is a `clamp()`; every grid is
   `auto-fit`/`auto-fill` with `minmax(min(Npx, X%), 1fr)`. The `min()` lets a cell fall
   below its nominal minimum on a narrow screen. Adding a breakpoint is almost always the
   wrong fix.
2. **`border-radius: 0` everywhere** except true circles. No box-shadows for depth —
   depth comes from gradients and hairlines. This design adds one exception: neon
   `box-shadow` used purely as *glow*, never as elevation, plus `clip-path` chamfers.

Data flow: `build.js` fetches keyless sources → writes `data/site.json` → `app.js`
renders the page from it. Nothing on the page is hardcoded except the curated content in
`content/curated.json`.

---

## Screens / Views

One page, twelve bands, in DOM order. Page max width `1500px`, gutter
`clamp(1.25rem, 4vw, 4.5rem)` (`--gut`), section padding `clamp(3.5rem, 10vw, 8rem)`
(`--sec-y`), band padding `clamp(3rem, 9vw, 6.5rem)` (`--band-y`).

### 0. Global overlays (two fixed layers, `pointer-events: none`)
- **Scanlines** — `z-index: 900`, `repeating-linear-gradient(to bottom, rgba(184,255,41,.035) 0 1px, transparent 1px 3px)`, `mix-blend-mode: screen`.
- **CRT vignette** — `z-index: 899`, `box-shadow: inset 0 0 clamp(60px,14vw,200px) rgba(0,0,0,.85), inset 0 0 clamp(30px,6vw,90px) rgba(184,255,41,.05)`.

### 1. Sticky header
`position: sticky; top: 0; z-index: 800`. Background `rgba(5,6,7,.84)`,
`backdrop-filter: blur(14px)`, bottom border `1px solid rgba(184,255,41,.18)`,
`box-shadow: 0 1px 26px rgba(184,255,41,.08)`. Padding `.35rem clamp(1rem,4vw,4.5rem)`.

- **Wordmark** — `NCT127.ONLINE`, Anton 1rem, `letter-spacing: .14em`. The `.` is
  `#B8FF29` with `text-shadow: 0 0 10px rgba(184,255,41,.8)`.
- **Nav** — eight links, Space Mono `.66rem`, `letter-spacing: .16em`, uppercase,
  `gap: 1.25rem`, `opacity: .62` → `1` on hover (`transition: opacity .25s`).
  `overflow-x: auto; scrollbar-width: none` — this is how eight links survive a phone
  with no hamburger. Every link `min-height: 44px`.
  Order: Drop · Wire · **Lineup** (`#B8FF29`) · **Redline** (`#FF2FB9`) · Discography ·
  Watch · News · Timeline.
- **Status** — pulsing 6px green dot + date, Space Mono `.6rem`, `#A8A49B`.

### 2. HUD rail
Full-bleed strip directly under the header. Background `#020302`, bottom border
`1px solid rgba(184,255,41,.16)`. Space Mono `.54rem`, `letter-spacing: .18em`,
uppercase, `#5f6b52`.
Left cell `SYS/ONLINE` in `#B8FF29` with a right hairline; the rest is a marquee
(`animation: nkSlide 46s linear infinite`, `gap: 2.5rem`) of readout strings:
`NODE 127.0 E` · `LINEUP 07 ACTIVE` · `BLINGY T-{n}D` · `REDLINE / 08 CITIES` ·
`SEOUL 18–20 SEP` · `ANNIV 10Y` · `FEED OK` · `SRC APPLE·DEEZER·YT`.
The list is duplicated so the `-50%` translate loops seamlessly. `T-{n}D` is derived from
the live countdown.

### 3. Hero
`min-height: min(94svh, 880px)`, `display: grid; align-items: end`, `isolation: isolate`,
`overflow: hidden`. Seven stacked layers, back to front:

| z | Layer |
|---|---|
| -5 | Flat `#070A06` |
| -4 | **Perspective grid floor** — `left/right: -20%; bottom: -4%; height: 52%`, `transform: perspective(340px) rotateX(64deg)` with `transform-origin: bottom`. Two linear-gradients at `120px 120px` (`rgba(184,255,41,.28)` horizontals, `.16` verticals). `animation: nkFloorPan 6s linear infinite` pans `background-position` 0 → 240px. Masked with `linear-gradient(to top, #000, transparent 78%)`. |
| -3 | Two radial washes — green `70% 58% at 78% 18%` at `.26`, magenta `58% 52% at 8% 74%` at `.22` |
| -2 | **Radar** — `top: 8%; right: 4%`, `width: min(46vw, 420px)`, square, three concentric 50%-radius hairlines (`inset: 0 / 14% / 34%`), plus `conic-gradient(from 0deg, rgba(184,255,41,.3), transparent 22%)` rotating on `nkRadar 6s linear infinite`. `opacity: .55` |
| -2 | Scrim — `linear-gradient(to top, #050607 3%, rgba(5,6,7,.86) 32%, rgba(5,6,7,.3) 72%, rgba(5,6,7,.18) 100%)` + `linear-gradient(to right, rgba(5,6,7,.84), rgba(5,6,7,.2) 58%, transparent 80%)` |
| -1 | Scan bar — 120px tall green gradient sweeping top→bottom, `nkScan 7s linear infinite` |
| -1 | Grain — inline SVG `feTurbulence baseFrequency='0.82' numOctaves='4'`, `inset: -50%`, `opacity: .12`, `nkGrain 700ms steps(2) infinite` |

Content grid: `repeat(auto-fit, minmax(min(320px,100%), 1fr))`,
`gap: clamp(1.75rem,5vw,4rem)`, `align-items: end`, padding
`clamp(4.5rem,12vw,8rem) var(--gut) clamp(1.5rem,4vw,3rem)`.

**Left column**
- Coordinate readout — Space Mono `.58rem`, `letter-spacing: .2em`, `#7c8a6a`, slash-separated:
  `SEQ 07` (green) / `LAT 37.5665 N` / `LON 127.0 E` / `10TH ANNIVERSARY` (magenta).
- Badge `Pre-order open` — `background: #B8FF29`, `color: #050607`, Space Mono 700 `.62rem`,
  `letter-spacing: .2em`, padding `.4rem .7rem`, `box-shadow: 0 0 26px rgba(184,255,41,.5)`.
  Contains an absolutely-positioned 36%-wide white gradient sheen on
  `nkSweep 3.6s ease-in-out infinite`.
- Meta line — `7th Album · 2026.08.24 · 9 tracks`, Space Mono `.64rem`, `#F4F1EA`,
  `text-shadow: 0 1px 12px rgba(5,6,7,.9)`.
- **H1 `NCT 127`** — Anton, `clamp(3.2rem, 13.5vw, 10.5rem)`, `line-height: .82`,
  `letter-spacing: -.02em`, colour `#B8FF29`, two stacked animations:
  `nkFlicker 8s linear infinite, nkGlitch 9s steps(1) infinite`.
- Album line — flex, baseline-aligned: `New album` (magenta, Space Mono `.68rem`,
  glow) + `BLINGY` (Anton `clamp(1.4rem,3.4vw,2.2rem)`, `#F4F1EA`) + `24.08.2026` (`#878787`).
- Blurb — `max-width: 44ch`, `#A8A49B`, `clamp(.95rem,1.1vw,1.05rem)`.
- Buttons — `Pre-order` (filled green, 700 weight, glow; hover → magenta fill) and
  `The Redline tour` (ghost, `1px solid rgba(244,241,234,.4)`; hover → green border +
  `rgba(184,255,41,.08)` fill). Both `min-height: 48px`, padding `.9rem 1.4rem`,
  Space Mono `.68rem`, `letter-spacing: .18em`, uppercase.
- Stat row — `border-top: 1px solid rgba(184,255,41,.2)`, `gap: clamp(1.25rem,4vw,3rem)`.
  Four stats, each `display: flex; flex-direction: column-reverse` so the number
  precedes the label in the DOM (screen-reader order) while sitting above it visually.
  Value Anton `clamp(1.6rem,4vw,2.6rem)`, `font-variant-numeric: tabular-nums`;
  label Space Mono `.58rem`, `#A8A49B`.
  `07 Members` · `09 Tracks` · `08 Tour dates` · `10 YRS Since 2016.07.07` (the `YRS` is a
  magenta `sup` at `.5em`).

**Right column** — album frame, `justify-self: end`, `width: min(100%, 400px)`.
`1px solid rgba(184,255,41,.35)`, `background: rgba(9,12,8,.72)`,
`backdrop-filter: blur(6px)`, `padding: 12px`,
`box-shadow: 0 0 50px rgba(184,255,41,.14), inset 0 0 40px rgba(184,255,41,.06)`.
Four 16px HUD corner brackets (`2px solid #B8FF29`, positioned at `-1px`).
Inside: square image slot. Caption row `7th Album` / `2026.08.24`, Space Mono 700 `.55rem`,
green and `#7c8a6a`.

### 4. Countdown band
Background `#040404`, borders `1px solid rgba(255,47,185,.22)`, padding
`clamp(2rem,5vw,3.25rem) var(--gut)`. Two overlays: magenta radial
`60% 140% at 50% 120%` at `.24`, and 48px vertical pinstripes at
`rgba(255,47,185,.09)`.

Left: `Drops in` label with a blinking 6px magenta square (`nkBlink 1.4s steps(1) infinite`);
`BLINGY · 7th album` in Anton `clamp(1.6rem,4.5vw,2.8rem)`, `#FF2FB9`,
`text-shadow: 0 0 20px rgba(255,47,185,.5)`; `24 August 2026 · 18:00 KST` below.

Right: four tiles, `display: grid; grid-template-columns: repeat(auto-fit, minmax(4.4rem,1fr))`,
`gap: clamp(.5rem,2vw,1.5rem)`, `flex: 1 1 320px; max-width: 34rem` — this is what makes
them wrap rather than crush on a phone. Each tile is chamfered bottom-right:
`clip-path: polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)`.
Days/Hrs/Min: `1px solid rgba(244,241,234,.14)`, `background: rgba(184,255,41,.03)`,
digits `#B8FF29` with `text-shadow: 0 0 18px rgba(184,255,41,.4)`.
Sec: `1px solid rgba(255,47,185,.5)`, `background: rgba(255,47,185,.08)`, digits `#FF2FB9`.
Digits Anton `clamp(1.8rem,5vw,3rem)`, tabular-nums, zero-padded to two places.
Labels Space Mono `.54rem`, `letter-spacing: .2em`, `#878787`.

### 5. The wire
Background `#080A08`. Bar row: pulsing dot + `The wire` (Space Mono `.62rem`,
`letter-spacing: .2em`) left, timestamp right.
Grid `repeat(auto-fit, minmax(min(300px,100%), 1fr))` — three across on desktop, one per
row on a phone, no breakpoint. Cells have right + bottom hairlines
`rgba(184,255,41,.12)`; hover `background: #0E120D`.

Cells: `01 / Release` (square art placeholder, Anton title, sub), `02 / Stage` (square
placeholder with a green scan bar on `nkScan 5.5s`), `03 / Press` (four stacked links,
each `.92rem` headline + Space Mono `.56rem` meta, hover `opacity: .7` and
`padding-left: .4rem`).
Kind labels Space Mono 700 `.58rem`, `letter-spacing: .2em`, `#B8FF29`.

### 6. Lineup
Background `#040504`. Green radial wash `110% 50% at 50% 0%` at `.11`.

- Eyebrow `Seven members · verified {date}` — Space Mono `.62rem`, `letter-spacing: .3em`.
- **H2 `LINEUP`** — Anton `clamp(3rem,13vw,9rem)`, `line-height: .85`, centred, with a
  text-clipped sheen: `linear-gradient(100deg, #5c6b3a 0%, #5c6b3a 34%, #DDFF7A 50%, #5c6b3a 66%, #5c6b3a 100%)`,
  `background-size: 300% 100%`, `animation: nkSheen 5s linear infinite`.
  First and last stops are the same colour so the tile is seamless — a list ending on the
  highlight drags a hard edge across the letters once per loop.
- **Name ticker** — bordered strip, `nkSlide 34s linear infinite`, Anton
  `clamp(1.5rem,4vw,2.25rem)`, `#B8FF29`, `text-shadow: 0 0 18px rgba(184,255,41,.35)`.
  Names duplicated for the loop. Edge-masked
  `linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)`.
- **Member cards** — `repeat(auto-fill, minmax(min(215px, 46%), 1fr))`,
  `gap: clamp(.75rem,1.8vw,1.5rem)`. The `46%` is load-bearing: it forces exactly two
  columns on a phone.
  Card: `1px solid rgba(184,255,41,.18)`, `background: rgba(8,10,8,.8)`, chamfered top-right
  and bottom-left —
  `clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))`.
  Hover: border `#B8FF29`, `translateY(-4px)`, `box-shadow: 0 0 40px rgba(184,255,41,.2)`.
  Two 12px corner brackets (top-left, bottom-right).
  Photo area `aspect-ratio: 3/4`. Position chip top-left: green fill, `#050607` text,
  Space Mono 700 `.5rem`, glow. Index `NO.01` bottom-left in green.
  Body: name Anton `clamp(1.3rem,2.6vw,1.85rem)`; Korean name Noto Sans KR `.72rem` `#878787`;
  then a three-row data readout above a `rgba(184,255,41,.14)` hairline —
  `Born` / `From` / `Status`, each `display: flex; justify-content: space-between`,
  Space Mono `.55rem`. Status is `#B8FF29` when Active, `#FF2FB9` when Service.
- **Line-up log** — rows with a `5.5rem` mono date, an Anton name, a mono description, and
  a right-aligned tag. Hover: `background: rgba(184,255,41,.05)`, `padding-left: .7rem`.
  Tag colours: Joined/Debut `#B8FF29`, Left `#FF2FB9`, Hiatus `#A8A49B`.

### 7. Redline (tour)
Background `#050405`, borders `rgba(255,47,185,.2)`. Magenta radial
`90% 55% at 50% 108%` at `.24`. A centred 1px vertical spine spanning the section:
`linear-gradient(180deg, transparent, rgba(255,47,185,.5) 30%, rgba(255,47,185,.5) 70%, transparent)` —
both ends transparent so it has no hard start or stop.

**H2 `NEO CITY / THE REDLINE`** on two lines, Anton `clamp(2.6rem,11vw,7.5rem)`,
`line-height: .86`, `#FF2FB9`, `text-shadow: 0 0 30px rgba(255,47,185,.45)`.

Date rows: `4.5rem` date block (Anton `1.9rem` day, magenta mono month, grey year),
city Anton `clamp(1.1rem,2.4vw,1.75rem)`, venue `.82rem` `#A8A49B`, mono status, then a
ghost `Tickets` button (hover → magenta fill + `box-shadow: 0 0 26px rgba(255,47,185,.45)`).
Row hover: `background: rgba(255,47,185,.05)`, `padding-left: .7rem`.

### 8. Discography
Section head: `border-bottom: 1px solid rgba(184,255,41,.22)`, H2 prefixed by a green
mono index `04`.
Filter chips: horizontal scroll, `min-height: 40px`, Space Mono `.6rem`. Inactive
`1px solid rgba(184,255,41,.25)`, `#878787`. Active green fill, `#050607` text,
`box-shadow: 0 0 22px rgba(184,255,41,.35)`.
Grid `repeat(auto-fill, minmax(min(150px, 46%), 1fr))` — again two columns on a phone.
Cards: square art with a bottom gradient scrim
(`linear-gradient(transparent, rgba(5,6,7,.92))`) carrying the kind label in green mono
`.54rem`; title `.85rem`/500; date mono `.6rem` `#878787`. Hover `opacity: .85`.

### 9. Watch
Index `05`. Grid `repeat(auto-fill, minmax(min(290px,100%), 1fr))`,
`gap: clamp(1rem,2.2vw,1.75rem)`. `16/9` thumbs with a 40px circular green play button
bottom-right, `box-shadow: 0 0 22px rgba(184,255,41,.55)`.

### 10. News
Index `06`. Rows: `5.5rem` mono date, headline `clamp(.98rem,1.7vw,1.25rem)` with
`text-wrap: pretty`, mono outlet. Hover `opacity: .72`, `padding-left: .5rem`.

### 11. Timeline
Index `07`. Rows: `3rem` mono year, then a body block with
`border-left: 1px solid rgba(184,255,41,.3)` and `padding-left: clamp(1rem,3vw,2rem)`.
Title Anton `clamp(1.25rem,3vw,2.1rem)`; text `max-width: 58ch`, `#A8A49B`, `.92rem`.

### 12. Facts
Centred, `max-width: 1000px`, background `#040504`, magenta radial at `.14`.
Quote Anton `clamp(1.3rem,3.6vw,2.7rem)`, `min-height: 4.4em` — the min-height stops the
arrows jumping as facts of different lengths swap.
Two 48px square buttons, `1px solid rgba(184,255,41,.3)`, hover → green fill with
`#050607` text. Counter `n / total` between them.

### 13. Footer
`border-top: 1px solid rgba(184,255,41,.22)`. Wordmark `NCT 127` Anton
`clamp(1.6rem,5vw,2.75rem)`, `#B8FF29`, `text-shadow: 0 0 24px rgba(184,255,41,.4)`.
Disclaimer `max-width: 52ch`, `.76rem`, `#878787`. Link list (YouTube, Instagram, X,
Apple Music, Spotify) mono `.64rem`, hover → green. Bottom bar: timestamp left,
`No trackers · no cookies` right.

---

## Interactions & Behavior

**Countdown** — a 1s interval recomputes `Date.now()` against
`2026-08-24T18:00:00+09:00`. All four fields zero-padded to two digits; clamped at 0
(`Math.max(0, target - now)`) so it never goes negative. Clear the interval on unmount.
The HUD rail's `BLINGY T-{n}D` string is derived from the same diff — one source.

**Discography filter** — chips set a single filter value (`All | Album | Repackage | EP`);
the grid derives from it. In press-it the filter and the "show all" collapse both derive
visibility from one function, because letting them each toggle `hidden` independently made
them undo each other. Keep that.

**Facts carousel** — prev/next wrap modulo the list length.

**Hover states** — every one is listed per-section above. Standard transition
`.25s`; transforms `.3s`; image scale `.7s cubic-bezier(.22, 1, .36, 1)`.

**Responsive** — no media queries. The four levers: `clamp()` on every size,
`auto-fit`/`auto-fill` grids with `minmax(min(Npx, X%), 1fr)`, the `46%` that pins member
and album grids to two columns on a phone, and `overflow-x: auto` on the nav and the
filter chips. All tap targets ≥ 44px.

**Reduced motion** — `@media (prefers-reduced-motion: reduce) { * { animation: none !important } }`.
Note the sheen caveat from press-it: the `LINEUP` wordmark is *painted* by its animation,
so freezing it leaves the text transparent. Fall back to flat `#F4F1EA` with
`-webkit-text-fill-color: currentColor` rather than just killing the animation.

---

## State Management

| State | Type | Purpose |
|---|---|---|
| `filter` | `'All' \| 'Album' \| 'Repackage' \| 'EP'` | Discography chips |
| `factIdx` | int | Facts carousel index |
| `now` | epoch ms | Ticks every 1000ms; drives the countdown and the HUD `T-{n}D` |

Data fetching: one `fetch('data/site.json')` at load, exactly as press-it does. Everything
else is derived. Serve over HTTP, not `file://` — the fetch is blocked on `file://`.

---

## Design Tokens

```css
:root {
  /* Surfaces, darkest to lightest */
  --ink:     #050607;  /* page */
  --ink-2:   #040404;  /* countdown band */
  --ink-3:   #040504;  /* lineup, facts */
  --ink-4:   #050405;  /* redline */
  --ink-5:   #080A08;  /* wire */
  --ink-6:   #070A06;  /* hero base */
  --ph-a:    #101410;  /* placeholder stripe A */
  --ph-b:    #161B15;  /* placeholder stripe B */
  --hover:   #0E120D;  /* wire cell hover */

  /* Ink */
  --bone:    #F4F1EA;
  --ash:     #A8A49B;
  --grey:    #878787;
  --moss:    #7c8a6a;  /* dim mono readout */
  --moss-2:  #5f6b52;  /* HUD rail text */
  --slate:   #6f7a6b;  /* placeholder caption */

  /* Neon */
  --neon:     #B8FF29;  /* primary — Neo Zone green */
  --neon-hi:  #DDFF7A;  /* sheen highlight stop only */
  --neon-lo:  #5c6b3a;  /* sheen base stop only */
  --magenta:  #FF2FB9;  /* secondary — Redline */

  /* Hairlines */
  --hair:        rgba(184,255,41,.22);
  --hair-mid:    rgba(184,255,41,.16);
  --hair-soft:   rgba(184,255,41,.12);
  --hair-faint:  rgba(184,255,41,.10);
  --hair-mag:    rgba(255,47,185,.20);
  --bone-hair:   rgba(244,241,234,.14);

  /* Glows — shadow used as light, never as elevation */
  --glow-sm:  0 0 16px rgba(184,255,41,.50);
  --glow-md:  0 0 26px rgba(184,255,41,.50);
  --glow-lg:  0 0 40px rgba(184,255,41,.20);
  --glow-mag: 0 0 26px rgba(255,47,185,.45);

  /* Type */
  --display: 'Anton', 'Arial Narrow', sans-serif;
  --body:    'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --mono:    'Space Mono', ui-monospace, 'Cascadia Mono', monospace;
  --kr:      'Noto Sans KR', var(--body);

  --ease:   cubic-bezier(.22, 1, .36, 1);
  --maxw:   1500px;
  --gut:    clamp(1.25rem, 4vw, 4.5rem);
  --sec-y:  clamp(3.5rem, 10vw, 8rem);
  --band-y: clamp(3rem, 9vw, 6.5rem);
}
```

Google Fonts: `Anton` · `Inter:wght@300;400;500;600` · `Space+Mono:wght@400;700` ·
`Noto+Sans+KR:wght@400;700`, `display=swap`.

**Type scale**
| Role | Font | Size | Other |
|---|---|---|---|
| Hero H1 | Anton | `clamp(3.2rem, 13.5vw, 10.5rem)` | `lh .82`, `ls -.02em` |
| Band H2 (Lineup) | Anton | `clamp(3rem, 13vw, 9rem)` | `lh .85` |
| Band H2 (Redline) | Anton | `clamp(2.6rem, 11vw, 7.5rem)` | `lh .86` |
| Section H2 | Anton | `clamp(2rem, 7vw, 4.5rem)` | `lh .9` |
| Card title | Anton | `clamp(1.3rem, 2.6vw, 1.85rem)` | `lh 1` |
| Body | Inter 300 | `clamp(.95rem, 1.1vw, 1.05rem)` | `lh 1.6` |
| Label / mono | Space Mono 400 | `.54–.68rem` | `ls .14–.3em`, uppercase |

**Radius** — `0` everywhere. Circles (`50%`) only for the live dot and play buttons.
Chamfers via `clip-path`, not radius: member cards
`polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))`;
countdown tiles `polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)`.

**Keyframes**
```
nkPulse   2.4s  live dot — opacity + expanding 7px ring
nkSlide   34/46s  marquee, translateX(0 → -50%) on a duplicated list
nkGrain   700ms steps(2)  hero noise jitter
nkRise    .8–1.1s  hero entrance, translateY(16px) + fade, staggered .05/.12/.2s
nkFlicker 8s    neon flicker on the H1 — opacity + three-layer text-shadow
nkGlitch  9s steps(1)  ±3px horizontal jump at 90/92/94%
nkSheen   5s    text-clipped gradient, background-position → -300%
nkScan    4.5–7s  scan bar, translateY(-10% → 1000%)
nkFloorPan 6s   grid floor, background-position 0 → 240px
nkSweep   3.6s  specular sweep across the pre-order badge
nkRadar   6s    conic sweep rotate(360deg)
nkBlink   1.4s steps(1)  countdown label square
```

---

## Assets

**Every image in the prototype is a placeholder.** They render as a 10px diagonal stripe
(`repeating-linear-gradient(135deg, #101410 0 10px, #161B15 10px 20px)`) with a Space Mono
caption in `#6f7a6b` naming what belongs there. There are no icons, no logos, no SVG
illustrations — the only glyphs are the `▶` play triangles and the `←` `→` arrows.

Placeholders to fill: hero album cover · wire release art · wire stage photo ·
7 member photos · 15 release covers · 6 video thumbnails.

**Do not hand-draw or generate these.** Follow press-it's approach exactly: album art and
video thumbnails are hotlinked from the source CDNs (`is1-ssl.mzstatic.com`,
`i.ytimg.com`) rather than rehosted, and the URLs arrive with the API response. Member
photos are the one class with no keyless API — they need to be curated by hand into
`content/curated.json`.

The hero cover slot in the prototype is a drag-and-drop target backed by
`image-slot.js` (bundled). That is a prototyping affordance, not part of the design —
drop it in the rebuild.

---

## Data sources

Reuse `press-it/build.js` wholesale; only the artist identifiers change.

| Source | Provides | Key |
|---|---|---|
| iTunes Search API | Discography + hi-res artwork | none |
| Deezer API | Discography cross-check | none |
| YouTube channel RSS | Latest videos | none |
| Google News RSS | Press coverage | none |
| Wikipedia REST | Biography, **current lineup** | none |
| MusicBrainz | Release metadata | none |

No API keys anywhere — nothing to expire, rotate or leak, so the job runs unattended.
Keep press-it's resilience contract: each source wrapped independently, a failed source
falls back to what is already on disk, two retries with backoff, 20s timeout, and no files
written when nothing substantive changed.

**Lineup tracking is the one new requirement.** The user's brief was that the site must
keep up with lineup changes on its own. Parse the current members from the Wikipedia
infobox rather than hardcoding them, diff against the previous `site.json`, and append any
difference to the line-up log with a `Joined` / `Left` / `Hiatus` tag. The `Status` field
(Active / Service) is curated — military service is not reliably machine-readable.

**Tour dates** — the six keyless sources do not cover concert dates. Either add a
Bandsintown/Songkick-style feed or hand-curate the dates in `content/curated.json`. The
user selected both options, so decide at implementation time; curation is the lower-risk
start.

---

## Content in the prototype

All of it is real and sourced (checked 8 August 2026), not lorem. Re-verify before launch —
this is a live subject.

- **Members (7)** — Johnny, Taeyong (leader), Yuta, Doyoung, Jaehyun, Jungwoo, Haechan.
  Doyoung and Jungwoo are on military service and marked `Service`.
- **Former** — Taeil (left Aug 2024), Mark (left April 2026), Winwin (concluded activities
  July 2026). Doyoung and Johnny joined Dec 2016 for *Limitless*; Jungwoo joined Sep 2018
  for *Regular-Irregular*.
- **BLINGY** — 7th album, 9 tracks, 24 August 2026 at 18:00 KST, SM / Virgin Music Group.
  10th-anniversary release, first since *WALK* (July 2024).
- **NEO CITY — THE REDLINE** — 5th tour. Opens KSPO Dome Seoul 18–20 September, then
  Jakarta, Hong Kong, Singapore, Bangkok, Taipei. Individual venue dates beyond Seoul are
  illustrative — confirm before launch.
- **Discography** — 15 entries, 2016 *NCT #127* through 2026 *BLINGY*.
- The footer disclaimer is carried over from press-it and should stay: unofficial fan
  project, unaffiliated with NCT 127 or SM Entertainment.

---

## Files

| File | What it is |
|---|---|
| `NCT 127.dc.html` | The design. Read for structure, exact values and copy. Not shippable. |
| `image-slot.js` | Prototyping helper for the drag-and-drop cover slot. Not part of the design. |
| `github.md` | Records the source association to `Kjubikstronk/press-it`. |

Reference repo — read these before starting, the whole design descends from them:
- `press-it/assets/css/style.css` — the design system and both invariants
- `press-it/index.html` — page structure and section ordering
- `press-it/assets/js/app.js` — the render-from-`site.json` pattern
- `press-it/build.js` — the six-source updater, dedup and fallback logic
- `press-it/README.md` — deployment, GitHub Pages, custom domain
