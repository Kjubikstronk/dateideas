# Release plan

Planning notes for taking "our dates" public. Nothing here is built yet.
Figures are rough estimates from 2026-09; check current prices and terms
before spending anything.

---

## 1. Order of work

1. **Sign-up + partner invite flow, privacy page, in-app account deletion.**
   Needed for both stores and for strangers at all. The invite screen is the
   most important screen in the launch: every user must bring a partner.
2. **Own domain** (~€10/year). Required for the Android wrapper, and the
   landing page lives there.
3. **Android first** via a TWA (cheap, fast, learn from real users).
4. **iOS** via Capacitor, together with native push notifications.
5. **Free maps** (see CLAUDE.md, "Maps (decided)") before any real marketing
   push — Google's bill scales with every user.
6. **Organic social**, then a small paid test. Paid ads last, and only once
   people stick around.

---

## 2. Packaging the web app

**Android — Trusted Web Activity.** The PWA runs full screen inside a Play
Store app. Generate with PWABuilder or Bubblewrap. Needs Digital Asset Links
(`/.well-known/assetlinks.json`) at the domain root, which is why the GitHub
Pages subpath won't do. Play developer account: $25 once.

**iOS — Capacitor.** Apple rejects thin web wrappers (guideline 4.2), so the
app must use real native features: push notifications (also better than web
push, which only works from a home-screen install on iOS), share sheet,
haptics, later a "next date in 3 days" widget. Apple developer account: $99
a year. Builds need a Mac, or a cloud Mac (Codemagic, GitHub macOS runners).

Capacitor can produce the Android build too, if one path for both is simpler.

**Store requirements:** privacy policy URL, in-app account deletion (Apple),
Data safety form (Google), age rating, screenshots, a demo account for
reviewers. Check the name "our dates" isn't taken in either store.

**Old iPhones:** Tailwind v4 needs Safari 16.4+. Older iOS renders broken.

---

## 3. Money

| Item | Cost |
|---|---|
| Google Play account | $25 once |
| Apple developer account | $99 / year |
| Domain | ~€10 / year |
| Free maps | €0 until thousands of users, ~€25–50 / month at tens of thousands |
| Firebase | Free plan until roughly tens of thousands of users, then pay-as-you-go |

**Income:** no in-app ads (they'd wreck the pixel design, pay very little at
small scale, and drag in tracking-consent work). Instead, **themes as a
supporter perk**: pink stays free; seasonal and extra themes unlock for
€1–2/month or one-off. Roughly 1 in 500 users paying covers the maps.

---

## 4. Organic social (TikTok + Instagram) — start here

Costs €0 and shows which angle works before any money is spent.

**Setup:** one handle on both platforms, ideally the app's name. Bio link to
the landing page (which links to both stores).

**Cadence:** 3–5 posts a week for 4–6 weeks. Post the same video to TikTok
and Instagram Reels.

**Format:** vertical 9:16, 7–15 seconds, hook in the first second, text on
screen (most watch muted), a trending sound, the app shown on a real phone
in hand rather than a flat screen recording.

**Content pillars:**

1. **The story.** "I built my girlfriend an app for our dates." Building
   something for someone is one of the strongest formats there is; it gives
   the account a face and a reason to follow.
2. **The blind rating reveal.** Each of you rated the date separately;
   show both scores appearing at once. The app's most unusual feature.
3. **Date idea lists.** "5 cheap dates in Amsterdam" with the pixel map
   filling up with pins. Useful, so people save and share it.
4. **Theme drops.** The Halloween switch with the bats and the greeting.
   Every new theme is a new post, and a reason for old users to come back.
5. **Relatable couple humour.** "Where do you want to eat?" / "I don't
   know" → opens the app.

**What to measure:** saves and shares matter more than views; profile visits
and link clicks show real interest. Keep a simple list of which posts did
best, since those are the ones to pay to boost.

**Micro-creators:** couple accounts with 5k–50k followers often beat ads.
Offer a free supporter subscription, or roughly €50–200 per post. Paid
posts must be labelled as ads (EU rules and both platforms' terms).

---

## 5. Paid ads — TikTok + Instagram

**Don't spend a cent until retention is proven.** If most couples still use
the app after 30 days, ads multiply that. If not, ads buy people who leave.

### Measuring without trackers

Ad-platform tracking SDKs and pixels need consent under GDPR (and Apple's
tracking prompt on iOS). Start without them: use **App Store Connect
campaign links** and **Google Play UTM links**, one per ad. The store
reports installs per link with nothing added to the app. Count "couples
where both partners joined" and "still active after 7 / 30 days" from our
own database.

### Phase 1 — test (2 weeks, ~€100)

- **What:** boost the 3 best organic posts, not new ad creatives. TikTok
  **Spark Ads**; Instagram **boosted posts**. Proven content is the cheapest
  reach you can buy.
- **Who:** ages 18–34, only countries where the app works (start NL, AT,
  DE), interests around relationships, dating, date ideas, going out.
- **Spend:** €3–5 a day per platform.
- **Goal:** app installs (or landing-page visits before the store launch).

### Decide

Rough cost per install for lifestyle apps in Western Europe: €1–5, more on
iOS than Android.

- **Stop** if cost per install is over ~€4, or fewer than ~30% of couples
  are still active on day 7. Fix the product or the videos first.
- **Continue** if cost per couple is low and they stay.

### Phase 2 — scale (only if the test worked)

- Raise budget on winning ads by 20–30% a week; big jumps reset the
  platforms' learning.
- Make new videos every 2–3 weeks — the same ad wears out.
- Cap total spend until income covers it: a user must bring in more than
  they cost to acquire. Remember each paid install brings a partner free.

### Seasonal pushes

| Moment | Organic from | Paid push |
|---|---|---|
| **Valentine's Day (14 Feb)** — the best launch moment | early January | 1–14 Feb |
| Halloween theme drop | late September | October |
| Christmas / winter theme | mid November | December |

Launching the store apps just before Valentine's Day gives a natural hook:
"plan your Valentine's date together".
