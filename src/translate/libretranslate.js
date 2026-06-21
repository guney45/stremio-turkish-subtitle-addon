'use strict'

// LibreTranslate sağlayıcısı (varsayılan).
// Açık kaynak, ücretsiz, çevrimdışı. /translate endpoint'i "q" alanında dizi kabul
// eder ve "translatedText" alanında aynı uzunlukta dizi döndürür.

const config = require('../config')
const { chunk, mapLimit, fetchWithTimeout } = require('../util')

async function rawTranslate(lines, { source, target }) {
  const body = { q: lines, source, target, format: 'text' }
  if (config.libreTranslate.apiKey) body.api_key = config.libreTranslate.apiKey

  let res
  try {
    res = await fetchWithTimeout(
      `${config.libreTranslate.url}/translate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      },
      config.translateTimeoutMs
    )
  } catch (e) {
    throw new Error(
      `LibreTranslate'e bağlanılamadı (${config.libreTranslate.url}): ${e.message}. ` +
        'Çalışıyor mu? `docker compose up -d libretranslate` ile başlatabilirsiniz.'
    )
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`LibreTranslate hatası (${res.status}): ${text}`)
  }
  const data = await res.json()
  return data.translatedText
}

async function translateBatch(lines, opts) {
  const out = await rawTranslate(lines, opts)
  if (Array.isArray(out) && out.length === lines.length) return out

  // Sunucu dizi desteklemiyorsa / hizalama bozuksa: satır satır yedek yol.
  return mapLimit(lines, config.translateConcurrency, async (line) => {
    const single = await rawTranslate([line], opts)
    if (Array.isArray(single)) return single[0]
    return single
  })
}

async function translate(lines, opts) {
  const batches = chunk(lines, config.translateBatchSize)
  let done = 0
  const results = await mapLimit(batches, config.translateConcurrency, async (batch) => {
    const out = await translateBatch(batch, opts)
    done += 1
    if (done === 1 || done === batches.length || done % 5 === 0) {
      console.log(`[libretranslate] ilerleme: ${done}/${batches.length} grup çevrildi`)
    }
    return out
  })
  return results.flat()
}

module.exports = { translate, id: 'libretranslate' }
