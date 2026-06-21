'use strict'

// Tüm akışı yöneten katman:
//   1) cache'te çevrilmiş VTT var mı?  -> varsa onu dön
//   2) ham İngilizce SRT cache'te var mı? -> yoksa OpenSubtitles'tan indir (kota)
//   3) çöz (kodlama/gzip) -> ayrıştır -> metinleri çevir (zaman damgaları sabit)
//   4) VTT üret -> cache'le -> dön
//
// Aynı dosya için eşzamanlı istekler tek bir çalışmada birleştirilir (dedupe).

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
    console.log(`[pipeline] cache HIT: file_id=${fileId} (${cached.length} byte)`)
    return { buffer: cached, path: outPath, fromCache: true }
  }

  console.log(`[pipeline] başla: file_id=${fileId} provider=${provider} ${config.sourceLang}->${target}`)
  const tStart = Date.now()

  // 1) Ham İngilizce altyazı (mümkünse cache'ten, kotayı koru)
  let rawBuffer = await cache.readIfExists(cache.rawPath(fileId))
  if (rawBuffer) {
    console.log(`[pipeline] ham altyazı cache'ten: ${rawBuffer.length} byte`)
  } else {
    const result = await opensubtitles.downloadSubtitle(fileId)
    rawBuffer = result.buffer
    await cache.write(cache.rawPath(fileId), rawBuffer)
  }

  // 2) Çöz + ayrıştır
  const text = subs.decodeBuffer(rawBuffer)
  const cues = subs.parse(text)
  console.log(`[pipeline] ayrıştırıldı: ${cues.length} satır`)
  if (!cues.length) {
    throw new Error('Altyazı çözümlenemedi (boş veya tanınmayan format).')
  }

  const lines = cues.map((c) => c.text)
  const sampleIn = lines.slice(0, 3).map((l) => l.replace(/\n/g, ' ')).join(' | ')
  console.log(`[pipeline] çeviri başlıyor (${lines.length} satır). Örnek giriş: ${sampleIn}`)

  // 3) Çevir (zaman damgaları sabit kalır)
  const tTr = Date.now()
  const translated = await translateLines(lines, { source: config.sourceLang, target })
  const sampleOut = translated.slice(0, 3).map((l) => String(l).replace(/\n/g, ' ')).join(' | ')
  console.log(`[pipeline] çeviri bitti (${Date.now() - tTr}ms). Örnek çıkış: ${sampleOut}`)

  // 4) VTT üret + cache
  const outCues = cues.map((cue, i) => ({
    start: cue.start,
    end: cue.end,
    text: translated[i] != null && String(translated[i]).trim() ? translated[i] : cue.text,
  }))
  const vtt = subs.buildVtt(outCues)
  const buffer = Buffer.from(vtt, 'utf8')
  await cache.write(outPath, buffer)
  console.log(`[pipeline] TAMAM: file_id=${fileId} VTT ${buffer.length} byte (toplam ${Date.now() - tStart}ms)`)
  return { buffer, path: outPath, fromCache: false }
}

function getTranslatedVtt(fileId) {
  const key = `${fileId}.${config.targetLang}.${config.provider}`
  if (inflight.has(key)) {
    console.log(`[pipeline] zaten işleniyor, mevcut işe katılıyor: file_id=${fileId}`)
    return inflight.get(key)
  }
  const promise = build(fileId).finally(() => inflight.delete(key))
  inflight.set(key, promise)
  return promise
}

module.exports = { getTranslatedVtt }
