'use strict'

// MyMemory sağlayıcısı (isteğe bağlı, anahtarsız).
// Meşru ücretsiz API ama her istek tek bir metindir ve günlük kelime limiti vardır
// (e-posta verilirse limit yükselir). Tam film için sınır aşılabilir; daha çok
// kısa içerik veya yedek için uygundur.

const config = require('../config')
const { mapLimit } = require('../util')

async function translateOne(line, { source, target }) {
  if (!line.trim()) return line
  const qp = new URLSearchParams()
  qp.set('q', line)
  qp.set('langpair', `${source}|${target}`)
  if (config.mymemory.email) qp.set('de', config.mymemory.email)

  const res = await fetch(`https://api.mymemory.translated.net/get?${qp.toString()}`)
  if (!res.ok) {
    throw new Error(`MyMemory hatası (${res.status})`)
  }
  const data = await res.json()
  if (data.responseStatus && Number(data.responseStatus) !== 200) {
    throw new Error(`MyMemory: ${data.responseDetails || data.responseStatus}`)
  }
  return (data.responseData && data.responseData.translatedText) || line
}

async function translate(lines, opts) {
  // Sınırlı eşzamanlılık (servis agresif istekleri kısıtlar)
  return mapLimit(lines, Math.min(config.translateConcurrency, 2), (line) =>
    translateOne(line, opts)
  )
}

module.exports = { translate, id: 'mymemory' }
