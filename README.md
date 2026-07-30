# ♡ our dates

A private date planner for two — a shared calendar and map where every pin
knows which day you're going there.

## How it stays private

GitHub Pages serves every site publicly. There is no setting that changes this
on a personal account, so **the site is not the secret** — it's an empty shell.
A stranger who finds the URL downloads a login screen and nothing else.

Everything real lives in Firestore behind three locks:

1. **Firestore rules** reject any read or write from a UID that isn't one of
   your two. These run on Google's servers and cannot be bypassed from a browser.
2. **Sign-up is disabled** in Firebase, so the public API key can't be used to
   register a new account.
3. **The Maps key is referrer-restricted** to your domain, so it can't be lifted
   from the bundle and spent.

The Firebase config and Maps key *are* visible in the JS bundle. That's normal
and unavoidable for any static site — Firebase treats the API key as a public
identifier, not a credential. The rules are the security boundary.

## Setup

Things only you can do. Work top to bottom.

### 1. Firebase

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. **Build → Authentication → Get started → Email/Password → Enable**
3. **Authentication → Users → Add user** — one account per person
4. ⚠️ **Authentication → Settings → User actions → untick "Enable create (sign-up)"**
   Skip this and anyone holding the public API key can register themselves in.
5. **Build → Firestore Database → Create database → Production mode**
6. Copy each UID from the Users tab — they go in the guest list in step 3
7. **Project settings → General → Your apps → Web app** — copy the config values
   into `.env.local` (see `.env.example`)

### 2. Google Maps

1. In [Google Cloud Console](https://console.cloud.google.com), select the same
   project Firebase created
2. Enable **Maps JavaScript API** and **Places API (New)**
3. Enable billing. The monthly free credit covers two people many times over,
   but a card is required.
4. **APIs & Services → Credentials → Create API key**
5. ⚠️ **Restrict the key**: Application restrictions → HTTP referrers → add
   `https://<your-username>.github.io/*` and `http://localhost:5173/*`
6. ⚠️ **Billing → Budgets & alerts** — set a small budget so a mistake pages you
   instead of billing you
7. **Google Maps Platform → Map management → Create Map ID** (Vector, JS) — the
   custom map styling needs this

### 3. Firestore rules

Copy [`firestore.rules`](firestore.rules) into **Firestore → Rules → Publish**,
with the UIDs from step 1.6 pasted into the guest list at the top.

The committed file is a **template** — nothing deploys it, you paste it into the
console by hand. Your filled-in copy lives in `firestore.rules.local`, which is
gitignored. UIDs aren't credentials, but there's no reason to publish them.

**Adding a second person later** is one line: create their user in
Authentication → Users, copy the UID, uncomment the second entry in `us()`,
paste it in, Publish. No migration, nothing lost, no other file changes.

### 4. GitHub

1. Create the repo and push
2. **Settings → Pages → Source: GitHub Actions**
3. **Settings → Secrets and variables → Actions** — add every `VITE_*` key from
   `.env.example` as a repository secret
4. If your repo isn't named `dateideas`, update `base` in `vite.config.ts` to
   match — Pages serves project sites from `/<repo>/`

## Running locally

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5173/dateideas/ — note the path, it matches the
GitHub Pages base.

## On your phone

This is built mobile-first — the phone layout is the primary one, and the wide
layout is the variation.

**Add it to your home screen.** Both of you should: iOS Safari → Share → Add to
Home Screen; Android Chrome → menu → Add to Home screen. It then launches
full-screen with no browser chrome and its own pixel-heart icon, which is most
of the difference between "a website" and "an app".

The icons are generated from the same pixel grid the app draws, so they never
drift from the design:

```bash
node scripts/make-icons.mjs
```

The layout deliberately reaches under the notch (`viewport-fit=cover`); the
`safe-frame` and `safe-bottom` utilities in `theme.css` keep anything tappable
clear of the notch and the home indicator.

## Design

The visual system lives in [`src/theme.css`](src/theme.css) and nowhere else.
Components consume its tokens rather than inventing values.

The organising idea is that the app is a **handheld device**, not a document —
a moulded bezel with a recessed screen. On a phone that's literal; on desktop
the shell widens and the screen splits in two, which is what earns the
side-by-side calendar/map layout.

Before changing any colour, re-run the audit — a palette this bright hides
contrast failures well:

```bash
node scripts/check-contrast.mjs
```

It checks every real pairing including the faded `/60` opacity variants, which
is where bright themes usually fail. It exits non-zero on a regression.

Two rules worth knowing before editing:

- `--color-hot` (#FF5CA8) is for fills and borders only. On the pink background
  it lands around 2.2:1 and fails WCAG as text. Pink *text* uses `--color-deep`.
- Motion uses `steps()` easing, never smooth curves. Pixel art doesn't
  interpolate, and it's the detail that sells the era.

## Verifying privacy

After deploying, confirm the lock actually holds:

- Open the live URL in a private window → a login box, nothing else. Check the
  Network tab: no Firestore documents should come down before you sign in.
- **Firestore → Rules → Rules Playground**: simulate a read as an unauthenticated
  user, and as some third UID. Both must be denied.
