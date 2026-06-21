'use strict'

const test = require('node:test')
const assert = require('node:assert')
const subs = require('../src/subtitles')

test('SRT ayrıştırma: zaman ve metin', () => {
  const srt = [
    '1',
    '00:00:01,000 --> 00:00:02,500',
    'Hello world',
    '',
    '2',
    '00:01:00,000 --> 00:01:02,000',
    'Second line',
    'with two rows',
    '',
  ].join('\n')

  const cues = subs.parse(srt)
  assert.equal(cues.length, 2)
  assert.equal(cues[0].start, 1000)
  assert.equal(cues[0].end, 2500)
  assert.equal(cues[0].text, 'Hello world')
  assert.equal(cues[1].start, 60000)
  assert.equal(cues[1].text, 'Second line\nwith two rows')
})

test('VTT ayrıştırma da çalışır (nokta ayraçlı zaman)', () => {
  const vtt = ['WEBVTT', '', '00:00:03.250 --> 00:00:04.000', 'Merhaba'].join('\n')
  const cues = subs.parse(vtt)
  assert.equal(cues.length, 1)
  assert.equal(cues[0].start, 3250)
  assert.equal(cues[0].text, 'Merhaba')
})

test('buildVtt geçerli WEBVTT üretir ve zamanları korur', () => {
  const cues = [{ start: 1000, end: 2500, text: 'Merhaba dünya' }]
  const out = subs.buildVtt(cues)
  assert.ok(out.startsWith('WEBVTT'))
  assert.ok(out.includes('00:00:01.000 --> 00:00:02.500'))
  assert.ok(out.includes('Merhaba dünya'))
})

test('decodeBuffer UTF-8 Türkçe karakterleri korur', () => {
  const text = 'Şunu gör: ığüçöş ĞÜÇÖŞİ'
  const decoded = subs.decodeBuffer(Buffer.from(text, 'utf8'))
  assert.equal(decoded, text)
})

test('parse -> buildVtt -> parse tur turu zamanı bozmaz', () => {
  const srt = '1\n00:00:01,000 --> 00:00:02,500\nA\n\n2\n00:00:05,000 --> 00:00:06,000\nB'
  const cues = subs.parse(srt)
  const vtt = subs.buildVtt(cues)
  const again = subs.parse(vtt)
  assert.deepEqual(
    again.map((c) => [c.start, c.end]),
    [
      [1000, 2500],
      [5000, 6000],
    ]
  )
})
