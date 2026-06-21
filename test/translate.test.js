'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { chunk, mapLimit } = require('../src/util')

test('chunk diziyi doğru böler', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]])
  assert.deepEqual(chunk([], 3), [])
})

test('mapLimit sırayı korur', async () => {
  const input = [1, 2, 3, 4, 5, 6]
  const out = await mapLimit(input, 2, async (x) => x * 10)
  assert.deepEqual(out, [10, 20, 30, 40, 50, 60])
})

test('mapLimit eşzamanlılık sınırını aşmaz', async () => {
  let active = 0
  let maxActive = 0
  await mapLimit([1, 2, 3, 4, 5, 6, 7, 8], 3, async () => {
    active++
    maxActive = Math.max(maxActive, active)
    await new Promise((r) => setTimeout(r, 5))
    active--
  })
  assert.ok(maxActive <= 3, `maxActive=${maxActive} 3'ü aşmamalı`)
})
