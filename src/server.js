'use strict'

const express = require('express')
const { getRouter } = require('stremio-addon-sdk')
const addonInterface = require('./addon')
const pipeline = require('./pipeline')
const subs = require('./subtitles')
const landing = require('./landing')
const config = require('./config')

function serveVtt(res, buffer, { store }) {
  res.setHeader('Content-Type', 'text/vtt; charset=utf-8')
  res.setHeader(
    'Cache-Control',
    store ? `public, max-age=${config.cacheMaxAge}` : 'no-store, no-cache, must-revalidate'
  )
  res.end(buffer)
}

function noticeBuffer(message) {
  return Buffer.from(subs.buildNoticeVtt(message), 'utf8')
}

function createApp() {
  const app = express()
  app.disable('x-powered-by')

  // Tüm yanıtlarda CORS (Stremio'nun altyazı dosyasını çekebilmesi için)
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    next()
  })

  // Stremio addon protokolü (manifest.json + /subtitles/...)
  app.use(getRouter(addonInterface))

  // Çevrilmiş altyazı dosyasını servis et: /sub/<file_id>.vtt
  app.get(/^\/sub\/(\d+)\.vtt$/, async (req, res) => {
    const fileId = req.params[0]
    const t0 = Date.now()
    console.log(`[sub] istek geldi: file_id=${fileId}`)
    try {
      // 1) Hazırsa (cache) anında ver
      const cached = await pipeline.readCached(fileId)
      if (cached) {
        serveVtt(res, cached, { store: true })
        console.log(`[sub] cache'ten verildi: file_id=${fileId} ${cached.length} byte (${Date.now() - t0}ms)`)
        return
      }

      // 2) Çeviriyi başlat/katıl; belirli süre bekle (yanıtı bloke etme)
      const build = pipeline.getTranslatedVtt(fileId)
      const raced = await Promise.race([
        build.then((r) => ({ ok: r })).catch((e) => ({ err: e })),
        new Promise((resolve) => setTimeout(() => resolve({ pending: true }), config.subWaitMs)),
      ])

      if (raced.ok) {
        serveVtt(res, raced.ok.buffer, { store: true })
        console.log(`[sub] çevrilip verildi: file_id=${fileId} ${raced.ok.buffer.length} byte (${Date.now() - t0}ms)`)
        return
      }

      if (raced.err) {
        console.error(`[sub] hata: file_id=${fileId}: ${raced.err.message}`)
        serveVtt(res, noticeBuffer(`Altyazı çevrilemedi: ${raced.err.message}`), { store: false })
        return
      }

      // 3) Henüz hazır değil -> placeholder göster, çeviri arka planda sürer
      console.log(
        `[sub] henüz hazır değil (${config.subWaitMs}ms beklendi), placeholder gönderildi; çeviri arka planda sürüyor: file_id=${fileId}`
      )
      serveVtt(
        res,
        noticeBuffer('⏳ Türkçe çeviri hazırlanıyor… Hazır olunca altyazıyı kapatıp tekrar seçin.'),
        { store: false }
      )
    } catch (e) {
      console.error(`[sub] beklenmeyen hata: file_id=${fileId}: ${e.message}`)
      res.status(502)
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end(`Hata: ${e.message}`)
    }
  })

  // Karşılama / kurulum sayfası
  app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(landing(addonInterface.manifest))
  })

  return app
}

module.exports = { createApp }
