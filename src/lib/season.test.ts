import { test } from 'node:test'
import assert from 'node:assert/strict'
import { settleSeason, keepChoice, inSeason, ARRIVED_KEY, AUTO_KEY } from './season.ts'
import { STORAGE_KEY } from './themes.ts'

function fakeStorage(initial: Record<string, string> = {}) {
  return {
    data: initial,
    getItem: (k: string) => (k in initial ? initial[k] : null),
    setItem: (k: string, v: string) => {
      initial[k] = v
    },
  }
}

test('only October is the season', () => {
  assert.equal(inSeason('2026-09-30'), false)
  assert.equal(inSeason('2026-10-01'), true)
  assert.equal(inSeason('2026-10-31'), true)
  assert.equal(inSeason('2026-11-01'), false)
})

test('the first October open switches to halloween and remembers it did', () => {
  const s = fakeStorage()
  assert.equal(settleSeason('pink', '2026-10-03', s), 'halloween')
  assert.equal(s.data[STORAGE_KEY], 'halloween')
  assert.equal(s.data[AUTO_KEY], '1')
  assert.equal(s.data[ARRIVED_KEY], '2026')
})

test('switching back to pink in October sticks — the season arrives once a year', () => {
  const s = fakeStorage()
  settleSeason('pink', '2026-10-03', s)
  keepChoice(s)
  assert.equal(settleSeason('pink', '2026-10-04', s), 'pink')
})

test('an auto-applied halloween leaves when October does', () => {
  const s = fakeStorage()
  settleSeason('pink', '2026-10-03', s)
  assert.equal(settleSeason('halloween', '2026-11-01', s), 'pink')
  assert.equal(s.data[STORAGE_KEY], 'pink')
  // And only once: a later manual pick of halloween is not undone.
  assert.equal(settleSeason('halloween', '2026-11-02', s), 'halloween')
})

test('a halloween the person chose survives November', () => {
  const s = fakeStorage()
  settleSeason('pink', '2026-10-03', s)
  keepChoice(s)
  assert.equal(settleSeason('halloween', '2026-11-01', s), 'halloween')
})

test('someone already on halloween is left alone and never auto-reverted', () => {
  const s = fakeStorage()
  assert.equal(settleSeason('halloween', '2026-10-03', s), 'halloween')
  assert.equal(settleSeason('halloween', '2026-11-01', s), 'halloween')
})

test('it comes back next October', () => {
  const s = fakeStorage()
  settleSeason('pink', '2026-10-03', s)
  settleSeason('halloween', '2026-11-01', s)
  assert.equal(settleSeason('pink', '2027-10-01', s), 'halloween')
})

test('storage that throws leaves the theme untouched', () => {
  const bad = {
    getItem: () => {
      throw new Error('denied')
    },
    setItem: () => {
      throw new Error('denied')
    },
  }
  assert.equal(settleSeason('pink', '2026-10-03', bad), 'pink')
  assert.doesNotThrow(() => keepChoice(bad))
})
