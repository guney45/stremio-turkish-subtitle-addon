'use strict'

const test = require('node:test')
const assert = require('node:assert')
const ids = require('../src/ids')

test('film id ayrıştırma', () => {
  const r = ids.parse('tt1254207')
  assert.equal(r.imdbId, 'tt1254207')
  assert.equal(r.imdbNumber, '1254207')
  assert.equal(r.isEpisode, false)
  assert.equal(r.season, undefined)
})

test('dizi id ayrıştırma (sezon:bölüm)', () => {
  const r = ids.parse('tt0944947:1:5')
  assert.equal(r.imdbId, 'tt0944947')
  assert.equal(r.imdbNumber, '944947') // baştaki sıfırlar atılır
  assert.equal(r.season, 1)
  assert.equal(r.episode, 5)
  assert.equal(r.isEpisode, true)
})

test('baştaki sıfırlar düzgün atılır', () => {
  assert.equal(ids.parse('tt0133093').imdbNumber, '133093')
})
