'use strict'

// Google Translate sağlayıcısı (isteğe bağlı, anahtarsız).
// Google'ın resmi olmayan ücretsiz web ucunu kullanır. Kalite iyidir ama
// Google şartlarına göre gri alandır ve yoğun kullanımda geçici engellenebilir.
// Hizalamayı garantilemek için satır satır çevirir.

const config = require('../config')
const { mapLimit } = require('../util')

async function translateOne(line, { source, target }) {
  if (!line.trim()) return line
  const qp = new URLSearchParams()
  qp.set('client', 'gtx')
  qp.set('sl', source)
  qp.set('tl', target)
  qp.set('dt', 't')
  qp.set('q', line)

  const url = `https://translate.googleapis.com/translate_a/single?${qp.toString()}`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) {
    throw new Error(`Google Translate hatası (${res.status})`)
  }
  const data = await res.json()
  // Yanıt: [[ ["çeviri","kaynak",...], ["çeviri2",...] ], ...]
  if (!Array.isArray(data) || !Array.isArray(data[0])) return line
  return data[0].map((seg) => (Array.isArray(seg) ? seg[0] : '')).join('')
}

async function translate(lines, opts) {
  return mapLimit(lines, Math.min(config.translateConcurrency, 5), (line) =>
    translateOne(line, opts)
  )
}

module.exports = { translate, id: 'google' }
