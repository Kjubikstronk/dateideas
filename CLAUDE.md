# our dates — working notes

A private date planner for couples. Calendar + Google Map + a list, with each
partner rating a date blind after the fact. Live at
**https://kjubikstronk.github.io/dateideas/** — Firebase project `dates-8910a`.

Two couples use it today: mck097@gmail.com + alice@dates.local (couple
`founders`), and milan@obradovic.at + sarah@hutter.at (couple `milan-sarah`).

---

## The two things that shape everything

**The site is public; the data is not.** GitHub Pages can't restrict access, so
the deployed page is an empty shell — a login box and nothing else. All privacy
is enforced by Firestore rules on Google's servers. The Firebase and Maps keys
are in the bundle deliberately; they're identifiers, not secrets. Sign-up is
disabled in the console, so nobody can self-register.

**Membership is a document, not a rule.** `members/{uid}` holds one field,
`coupleId`; every date carries the same field and the rules compare them.
`firestore.rules` contains no UIDs at all.

To add a person: create the account in Firebase Auth, then create
`members/{their-uid}` with the right `coupleId`. No code, no rules edit, no
deploy. An account with no members doc sees "not paired up yet".

---

## Commands worth knowing

```bash
npm run rules   # deploys firestore.rules from the repo — never paste into the console
npm run ui      # preview mode: sample data, no Firebase, no login
```

`.env.local` (keys) and the Firebase MCP need `firebase login` once.

---

## Gotchas that have already cost us time

**Firestore rejects any query it can't prove is safe.** An unscoped
`collection(db,'dates')` read is denied outright once the rules scope by
`coupleId` — not filtered, denied. Client query and rules must agree. This is
why the couples migration had to ship in two ordered steps.

**Rules take effect instantly; data doesn't migrate itself.** Deploying rules
that require a field before backfilling that field locks everyone out. Deploy
the app first, then tighten the rules.

**`Map` from `@vis.gl/react-google-maps` shadows the global `Map`.** It's
aliased to `GoogleMap` in DateMap.tsx. Don't un-alias it.

**No hooks after an early return.** This has bitten twice. Lint catches it —
run `npm run lint` before committing.

**`DateCard` is memoised and keyed by id**, so it survives every Firestore
snapshot. Any local state seeded at mount goes stale when the partner writes.
Seed on open, not on mount.

**Dates are `yyyy-MM-dd` strings, never Date objects or timestamps.** They sort
and compare correctly and can't drift by timezone. A date happening *today* is
not past — use `<`, not `<=`.

**Fonts are self-hosted (`@fontsource`, imported in `main.tsx`).** Never
re-add the Google Fonts `<link>`: it sends every visitor's IP to Google
before any consent, which German courts have ruled a GDPR breach. Bundled,
they are also precached, so the pixel type works offline.

**One service worker only.** `vite-plugin-pwa` owns it. Adding Firebase
messaging later needs `injectManifest` and a single combined worker, not a
second file at the same scope.

**Places bills by the highest field tier requested.** `rating` is the only
Enterprise-tier field left and buys just the `4.3 ★` on the map candidate card.
Detail lookups are cached per session — don't remove that, every map POI tap is
otherwise billable.

---

## Design constraints — do not violate

Y2K handheld device: 3px ink borders, hard offset shadows with no blur,
`steps()` easing only, `border-radius: 0`.

- ink `#1A1033` · paper `#FFE5F1` · card `#FFFDFE` · hot `#FF5CA8` ·
  deep `#B31E67` · lavender `#B8A6FF` · aqua `#5BE0E6` · mute `#6B6480`
- **Hot pink is fills and borders only** — it fails contrast as text. Pink text
  uses deep. Everything must pass WCAG AA.
- Mobile-first, 375px primary. Touch targets ≥44px. **Inputs ≥16px** or iOS
  zooms the page and won't zoom back.
- **Emoji, not custom pixel art**, for categories and weather. Decided; my
  hand-drawn set was rejected and rightly so.
- Never restyle Google's map tiles to the app palette — pink roads are
  illegible. Dark themes use Google's own dark scheme (`colorScheme`), which
  needs the real map ID in `VITE_GOOGLE_MAPS_MAP_ID`; `DEMO_MAP_ID` ignores it.
- Agenda entries are flat rows; a card lifts only while being worked on. The
  device bezel keeps the only 6px shadow.

---

## Themes

Per-person, in `localStorage`, never Firestore. Picked from the bezel menu.

- **Every colour lives in `src/theme.css`.** `@theme` is the default (pink);
  each other theme is a `[data-theme="…"]` block. TypeScript holds only ids,
  names, glyph grids and a `dark` flag — never a hex.
- **Tokens are roles, not colours.** `line` borders, `text` body copy,
  `shadow` hard shadows, `on-fill` text on a saturated fill, `bezel` /
  `on-bezel` the case, `rule` hairline dividers. On pink several share
  `#1A1033`; on a dark theme they must not. Choose by what the colour is
  *doing* — a blind rename to `text` has broken contrast three times.
- **`deep` is "the sibling of `hot` safe as text", not "the darker one."**
  On a dark ground it is lighter than `hot`.
- **Contrast is a gate:** `npm run contrast` parses `theme.css` and checks
  every theme. `npm run check` runs lint, contrast, tests and build.
- **`useTheme` is a shared store** (`useSyncExternalStore`). A per-component
  `useState` let the palette change while every glyph kept the old theme.
- **The glyph swaps with the theme** via `PixelHeart`. It must survive 8px
  (calendar markers): check with `node scripts/check-glyph.mjs <THEME>`.
- `<dialog>` resets inherited colour to `CanvasText`, so `.sheet` sets
  `color` explicitly. Don't remove it.
- **Spooky season** (`src/lib/season.ts`): the first open in October flips
  the theme to Halloween and the greeting (bats, moon) announces it, once a
  year. A theme the season applied goes back to pink in November; one picked
  from the menu stays. Test it by faking the date (Playwright `page.clock`).

## Verification habits that have paid off

- Probe security live rather than assuming: unauthenticated reads/writes of
  `dates`, `members`, `reports` must all return 403.
- The in-app browser **cannot composite** — CSS transitions freeze mid-flight,
  `requestAnimationFrame` never fires, and Google Maps tiles never paint. Verify
  logic and inline styles, not appearance. Never schedule anything on rAF alone.
- Deployed and local bundle hashes differ legitimately (CI uses `npm install`,
  not `npm ci`). Use the Actions status to confirm a deploy, not a hash.

---

## Open work

**Notifications** — planned, not started. Decided: GitHub Actions cron + FCM
(free, no Blaze upgrade). Girlfriend has an iPhone 13, so Web Push is viable,
but on iOS it works **only** from a home-screen install — never in a Safari tab.
Needs: combined service worker, permission asked after scheduling (not on load),
tokens on `members/{uid}` behind a narrow rules exception, daily sender, real
device testing.

**Before any public release** — three product decisions, not bugs:
1. There is no sign-up flow. Every couple is manual work.
2. `reports` are readable by all members — one couple's bug reports are visible
   to every other. Fine for people who know each other; a leak with strangers.
3. The Maps budget is €2. It would be exhausted fast at scale, and the map then
   silently dies for everyone.

Also note: this is a **web app**. "Release on mobile" means Add to Home Screen.
A store listing would need Capacitor-style wrapping, review, and Apple's
$99/year.

**Dropped deliberately** — couple nameplate, "go again" duplicate button,
inline day-picking on someday cards, calendar `.ics` subscription, JSON export,
surprise-me dice, custom pixel stickers, photos on memories.

---

## Working style that suits this project

The owner is watching a weekly token budget. Prefer Sonnet for routine work and
save Opus for security rules, race conditions and genuine debugging. Be
economical, verify rather than assume, and say plainly when something is
unverified.
