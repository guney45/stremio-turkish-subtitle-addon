'use strict'

// DeepL sağlayıcısı (isteğe bağlı). Çok iyi Türkçe kalite, ücretsiz anahtar
// ayda 500.000 karakter sunar. Tek istekte 50 metne kadar gönderilebilir.

const config = require('../config')
const { chunk, mapLimit } = require('../util')

const BATCH_SIZE = 50

function endpoint() {
  return config.deepl.free
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate'
}

async function translateBatch(lines, { source, target }) {
  if (!config.deepl.apiKey) {
    throw new Error('DEEPL_API_KEY tanımlı değil. .env dosyasına ekleyin.')
  }
  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${config.deepl.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: lines,
      source_lang: source.toUpperCase(),
      target_lang: target.toUpperCase(),
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`DeepL hatası (${res.status}): ${text}`)
  }
  const data = await res.json()
  return (data.translations || []).map((t) => t.text)
}

async function translate(lines, opts) {
  const batches = chunk(lines, BATCH_SIZE)
  const results = await mapLimit(batches, Math.min(config.translateConcurrency, 4), (batch) =>
    translateBatch(batch, opts)
  )
  return results.flat()
}

module.exports = { translate, id: 'deepl' }
