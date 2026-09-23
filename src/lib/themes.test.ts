import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isThemeId, readTheme, writeTheme, THEMES, STORAGE_KEY, glyphFor } from './themes.ts'

/** Stands in for the browser's, so the fallbacks can be driven directly. */
function fakeStorage(initial: Record<string, string> = {}, throws = false) {
  return {
    getItem: (k: string) => {
      if (throws) throw new Error('denied')
      return k in initial ? initial[k] : null
    },
    setItem: (k: string, v: string) => {
      if (throws) throw new Error('denied')
      initial[k] = v
    },
  }
}

test('every registered theme has an id, a name and a rectangular glyph', () => {
  assert.ok(THEMES.length >= 1)
  for (const t of THEMES) {
    assert.ok(t.id, 'missing id')
    assert.ok(t.name, `${t.id} missing name`)
    assert.ok(Array.isArray(t.glyph) && t.glyph.length > 0, `${t.id} missing glyph`)
    assert.ok(
      t.glyph.every((row) => row.length === t.glyph[0].length),
      `${t.id} glyph is ragged`,
    )
  }
})

test('theme ids are unique', () => {
  assert.equal(new Set(THEMES.map((t) => t.id)).size, THEMES.length)
})

test('isThemeId accepts registered ids and rejects everything else', () => {
  assert.equal(isThemeId('pink'), true)
  assert.equal(isThemeId('not-a-theme'), false)
  assert.equal(isThemeId(null), false)
  assert.equal(isThemeId(42), false)
  assert.equal(isThemeId(undefined), false)
})

test('an unknown stored id falls back to pink', () => {
  assert.equal(readTheme(fakeStorage({ [STORAGE_KEY]: 'not-a-theme' })), 'pink')
})

test('a missing value falls back to pink', () => {
  assert.equal(readTheme(fakeStorage()), 'pink')
})

test('storage that throws falls back to pink instead of crashing', () => {
  assert.equal(readTheme(fakeStorage({}, true)), 'pink')
})

test('a valid stored id is honoured', () => {
  assert.equal(readTheme(fakeStorage({ [STORAGE_KEY]: 'pink' })), 'pink')
})

test('writeTheme round-trips through readTheme', () => {
  const store = fakeStorage()
  writeTheme('pink', store)
  assert.equal(readTheme(store), 'pink')
})

test('writeTheme swallows a throwing storage', () => {
  assert.doesNotThrow(() => writeTheme('pink', fakeStorage({}, true)))
})

test('glyphFor returns the default theme glyph for an unknown id', () => {
  // @ts-expect-error deliberately passing an id that is not registered
  assert.deepEqual(glyphFor('nope'), THEMES[0].glyph)
})

test('the [data-theme=pink] block matches the @theme defaults exactly', async () => {
  const { readFileSync } = await import('node:fs')
  const css = readFileSync('src/theme.css', 'utf8')
  const decls = (block: string) =>
    Object.fromEntries(
      [...block.matchAll(/(--color-[a-z-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
    )

  const base = css.match(/@theme\s*\{([\s\S]*?)\n\}/)
  const pink = css.match(/\[data-theme='pink'\]\s*\{([\s\S]*?)\n\}/)
  assert.ok(base, 'no @theme block')
  assert.ok(pink, 'no [data-theme=pink] block — swatches cannot preview the default palette')
  // The duplication exists so a swatch can scope to the default palette. It
  // only stays safe while the two agree.
  assert.deepEqual(decls(pink![1]), decls(base![1]))
})
