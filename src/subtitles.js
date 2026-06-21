'use strict'

const zlib = require('zlib')
const chardet = require('chardet')
const iconv = require('iconv-lite')

// --- Kodlama / sıkıştırma ---

// Gzip ile sıkıştırılmışsa açar (OpenSubtitles bazen gzip döner).
function maybeGunzip(buffer) {
  if (buffer && buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
    try {
      return zlib.gunzipSync(buffer)
    } catch (_) {
      /* gzip değilmiş, olduğu gibi devam */
    }
  }
  return buffer
}

// Ham altyazı buffer'ını UTF-8 metne çevirir. Türkçe/İngilizce için kodlamayı
// otomatik tespit eder (latin1, windows-1254, utf-8 ...).
function decodeBuffer(buffer) {
  const buf = maybeGunzip(buffer)
  let encoding = chardet.detect(buf) || 'UTF-8'
  if (/^ascii$/i.test(encoding)) encoding = 'UTF-8'
  let text
  try {
    text = iconv.decode(buf, encoding)
  } catch (_) {
    text = buf.toString('utf8')
  }
  return text.replace(/^﻿/, '')
}

// --- Zaman damgası dönüşümleri ---

function timeToMs(ts) {
  const clean = ts.trim().replace(',', '.')
  const parts = clean.split(':')
  let h = 0
  let m = 0
  let s = 0
  if (parts.length === 3) {
    h = parseInt(parts[0], 10)
    m = parseInt(parts[1], 10)
    s = parseFloat(parts[2])
  } else if (parts.length === 2) {
    m = parseInt(parts[0], 10)
    s = parseFloat(parts[1])
  } else {
    s = parseFloat(parts[0])
  }
  return Math.round((h * 3600 + m * 60 + s) * 1000)
}

function pad(n, len = 2) {
  return String(n).padStart(len, '0')
}

function msToVtt(ms) {
  let rest = Math.max(0, Math.round(ms))
  const h = Math.floor(rest / 3600000)
  rest %= 3600000
  const m = Math.floor(rest / 60000)
  rest %= 60000
  const s = Math.floor(rest / 1000)
  const millis = rest % 1000
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(millis, 3)}`
}

const TIME = '(\\d{1,3}:)?\\d{1,2}:\\d{1,2}[,.]\\d{1,3}'
const CUE_TIME_RE = new RegExp(`(${TIME})\\s*-->\\s*(${TIME})`)

// Hem SRT hem VTT'yi ayrıştırır (ikisi de "-->" satırı içerir).
// Dönüş: [{ start, end, text }] (ms cinsinden zamanlar)
function parse(text) {
  const normalized = String(text)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^﻿/, '')

  const blocks = normalized.split(/\n{2,}/)
  const cues = []

  for (const block of blocks) {
    const lines = block.split('\n')
    let timeIndex = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeIndex = i
        break
      }
    }
    if (timeIndex === -1) continue // WEBVTT başlığı, NOTE, boş blok vs.

    const match = lines[timeIndex].match(CUE_TIME_RE)
    if (!match) continue

    const start = timeToMs(match[1])
    const end = timeToMs(match[3])
    const textLines = lines.slice(timeIndex + 1)
    const cueText = textLines.join('\n').trim()
    if (!cueText) continue

    cues.push({ start, end, text: cueText })
  }

  return cues
}

// cue dizisinden geçerli bir WebVTT metni üretir.
function buildVtt(cues) {
  let out = 'WEBVTT\n\n'
  cues.forEach((cue, i) => {
    out += `${i + 1}\n`
    out += `${msToVtt(cue.start)} --> ${msToVtt(cue.end)}\n`
    out += `${cue.text}\n\n`
  })
  return out
}

// Bilgilendirme amaçlı (placeholder / hata) VTT üretir: mesajı ilk birkaç dakika
// boyunca periyodik gösterir, böylece kullanıcı ekranda görür.
function buildNoticeVtt(message, { everyMs = 30000, count = 12, durationMs = 6000 } = {}) {
  const cues = []
  for (let i = 0; i < count; i++) {
    const start = i * everyMs
    cues.push({ start, end: start + durationMs, text: message })
  }
  return buildVtt(cues)
}

module.exports = {
  decodeBuffer,
  maybeGunzip,
  parse,
  buildVtt,
  buildNoticeVtt,
  timeToMs,
  msToVtt,
}
