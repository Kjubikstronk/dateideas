/**
 * A smoke test in Safari's engine, on an emulated iPhone 13.
 *
 *   npm run ui            (in one terminal — the sample-data preview)
 *   npm run safari        (in another)
 *
 * This is WebKit, the engine inside Safari, with the iPhone's viewport, touch
 * and user agent. It is NOT iOS: home-screen behaviour, push notifications
 * and iOS-only quirks still need a real phone. It catches rendering and CSS
 * differences between Safari and Chrome, which is most of what bites.
 *
 * Screenshots land in the OS temp folder (the path is printed at the end).
 */
import { webkit, devices } from 'playwright'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const URL = process.argv[2] ?? 'http://localhost:5174/dateideas/'
const OUT = join(tmpdir(), 'dateideas-safari')
mkdirSync(OUT, { recursive: true })

let failed = 0
const check = (ok, what, detail = '') => {
  if (!ok) failed++
  console.log(`${ok ? '  pass' : '  FAIL'}  ${what}${detail ? `  (${detail})` : ''}`)
}

const browser = await webkit.launch()
const ctx = await browser.newContext({ ...devices['iPhone 13'] })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

try {
  await page.goto(URL)
} catch {
  console.error(`Could not reach ${URL}. Is \`npm run ui\` running?`)
  await browser.close()
  process.exit(1)
}

// A clean start on pink, with this year's greeting marked seen so it does
// not cover the first screenshots.
const year = String(new Date().getFullYear())
await page.evaluate((y) => {
  localStorage.clear()
  localStorage.setItem('dateideas:theme', 'pink')
  localStorage.setItem('dateideas:seen-halloween', y)
}, year)
await page.reload()
await page.getByRole('button', { name: /^all dates$/i }).waitFor()
await page.evaluate(() => document.fonts.ready)

console.log(`\nSafari engine (WebKit ${browser.version()}) on iPhone 13 — ${URL}\n`)

// Fonts: bundled, never fetched from Google.
const fonts = await page.evaluate(() =>
  [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family),
)
for (const f of ['Pixelify Sans Variable', 'Space Grotesk Variable', 'Silkscreen']) {
  check(fonts.includes(f), `font loads: ${f}`)
}
const hosts = await page.evaluate(() =>
  performance.getEntriesByType('resource').map((e) => new URL(e.name).host),
)
check(!hosts.some((h) => h.includes('fonts.g')), 'nothing fetched from Google Fonts')

await page.screenshot({ path: join(OUT, '1-agenda-pink.png') })

// In a Safari tab (not the home-screen app) the install nudge shows. It used
// to sit on top of the tab bar; nothing it covers should be what a tap hits.
const later = page.getByRole('status').getByRole('button', { name: 'later' })
if (await later.count()) {
  const covered = await page.evaluate(() =>
    [...document.querySelectorAll('nav button, button')]
      .filter((b) => /^(calendar|map|all dates|\+ new date)$/i.test(b.textContent.trim()))
      .filter((b) => {
        const r = b.getBoundingClientRect()
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
        return !b.contains(hit)
      })
      .map((b) => b.textContent.trim()),
  )
  check(covered.length === 0, 'install nudge covers no tab or "+ new date"', covered.join(', '))
  await page.screenshot({ path: join(OUT, '1b-install-nudge.png') })
  await later.first().tap()
  await page.waitForTimeout(300)
  const room = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--nudge-h').trim(),
  )
  check(room === '0px', 'dismissing it gives the room back', room)
}

// A tapped button must not stay sunk (sticky :hover on touch screens).
const tab = page.getByRole('button', { name: /^calendar$/i })
await tab.tap()
await page.waitForTimeout(400)
const sunk = await tab.evaluate((b) => getComputedStyle(b).transform)
check(sunk === 'none', 'tapped button springs back', sunk)

// Inputs under 16px make iOS zoom the page and never zoom back.
await page.getByRole('button', { name: /new date/ }).tap()
await page.waitForTimeout(500)
const small = await page.evaluate(() =>
  [...document.querySelectorAll('dialog[open] input, dialog[open] textarea, dialog[open] select')]
    .map((el) => parseFloat(getComputedStyle(el).fontSize))
    .filter((px) => px < 16),
)
check(small.length === 0, 'every input is at least 16px', small.join(', '))
await page.screenshot({ path: join(OUT, '2-new-date.png') })
await page.keyboard.press('Escape')

// Halloween, and the greeting with its bats.
await page.evaluate(() => localStorage.removeItem('dateideas:seen-halloween'))
await page.getByRole('button', { name: /^look:/ }).tap()
await page.getByRole('button', { name: /halloween/ }).tap()
await page.waitForSelector('dialog.season[open]', { timeout: 5000 })
check(
  (await page.evaluate(() => document.documentElement.dataset.theme)) === 'halloween',
  'theme switches to halloween',
)
const batsAt = () =>
  page.evaluate(() => [...document.querySelectorAll('.bat')].map((b) => b.getBoundingClientRect().x))
const before = await batsAt()
await page.waitForTimeout(1200)
const after = await batsAt()
check(before.length > 0 && before.some((x, i) => x !== after[i]), 'bats fly', `${before.length} bats`)
const faded = await page.evaluate(() =>
  [...document.querySelectorAll('dialog.season .rise')].filter((e) => getComputedStyle(e).opacity !== '1')
    .length,
)
check(faded === 0, 'greeting fully arrives')
await page.screenshot({ path: join(OUT, '3-spooky-greeting.png') })

await page.getByRole('button', { name: /let.s go/ }).tap()
await page.waitForTimeout(400)
await page.screenshot({ path: join(OUT, '4-agenda-halloween.png') })

check(errors.length === 0, 'no page errors', errors.join(' | '))

await browser.close()
console.log(`\nScreenshots: ${OUT}`)
console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.')
process.exit(failed ? 1 : 0)
