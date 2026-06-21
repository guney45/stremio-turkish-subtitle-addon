'use strict'

// Tüm akışı yöneten katman:
//   1) cache'te çevrilmiş VTT var mı?  -> varsa onu dön
//   2) ham İngilizce SRT cache'te var mı? -> yoksa OpenSubtitles'tan indir (kota)
//   3) çöz (kodlama/gzip) -> ayrıştır -> metinleri çevir (zaman damgaları sabit)
//   4) VTT üret -> cache'le -> dön
//
// Aynı dosya için eşzamanlı istekler tek bir çalışmada birleştirilir (dedupe)
// böylece çift indirme / çift kota tüketimi olmaz.

const config = require('./config')
const cache = require('./cache')
const opensubtitles = require('./opensubtitles')
const subs = require('./subtitles')
const { translateLines } = require('./translate')

const inflight = new Map()

async function build(fileId) {
  const provider = config.provider
  const target = config.targetLang
  const outPath = cache.translatedPath(fileId, target, provider)

  const cached = await cache.readIfExists(outPath)
  if (cached) {
    return { buffer: cached, path: outPath, fromCache: true }
  }

  // Ham İngilizce altyazı (mümkünse cache'ten, kotayı koru)
  let rawBuffer = await cache.readIfExists(cache.rawPath(fileId))
  let downloadInfo = null
  if (!rawBuffer) {
    const result = await opensubtitles.downloadSubtitle(fileId)
    rawBuffer = result.buffer
    downloadInfo = result.info
    await cache.write(cache.rawPath(fileId), rawBuffer)
    if (downloadInfo && typeof downloadInfo.remaining === 'number') {
      console.log(`[opensubtitles] indirildi; bugün kalan kota: ${downloadInfo.remaining}`)
    }
  }

  const text = subs.decodeBuffer(rawBuffer)
  const cues = subs.parse(text)
  if (!cues.length) {
    throw new Error('Altyazı çözümlenemedi (boş veya tanınmayan format).')
  }

  const lines = cues.map((c) => c.text)
  const translated = await translateLines(lines, { source: config.sourceLang, target })

  const outCues = cues.map((cue, i) => ({
    start: cue.start,
    end: cue.end,
    text: translated[i] != null && String(translated[i]).trim() ? translated[i] : cue.text,
  }))

  const vtt = subs.buildVtt(outCues)
  const buffer = Buffer.from(vtt, 'utf8')
  await cache.write(outPath, buffer)
  console.log(`[pipeline] çeviri tamam: file_id=${fileId}, ${cues.length} satır`)
  return { buffer, path: outPath, fromCache: false }
}

function getTranslatedVtt(fileId) {
  const key = `${fileId}.${config.targetLang}.${config.provider}`
  if (inflight.has(key)) return inflight.get(key)
  const promise = build(fileId).finally(() => inflight.delete(key))
  inflight.set(key, promise)
  return promise
}

module.exports = { getTranslatedVtt }
