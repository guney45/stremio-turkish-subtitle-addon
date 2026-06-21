'use strict'

const express = require('express')
const { getRouter } = require('stremio-addon-sdk')
const addonInterface = require('./addon')
const pipeline = require('./pipeline')
const landing = require('./landing')
const config = require('./config')

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
    try {
      const { buffer } = await pipeline.getTranslatedVtt(fileId)
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8')
      res.setHeader('Cache-Control', `public, max-age=${config.cacheMaxAge}`)
      res.end(buffer)
    } catch (e) {
      console.error('[sub] servis hatası:', e.message)
      res.status(502)
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end(`Altyazı çevrilemedi: ${e.message}`)
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
