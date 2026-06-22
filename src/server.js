'use strict'

const express = require('express')
const qs = require('querystring')
const config = require('./config')
const manifest = require('./manifest')
const addon = require('./addon')
const pipeline = require('./pipeline')
const subs = require('./subtitles')
const meta = require('./meta')
const queue = require('./queue')
const landing = require('./landing')
const preparePage = require('./preparePage')

// /subtitles/<type>/<id>[/<extra>].json  (id dizide tt..:S:E olabilir; extra tek segment)
const SUB_RE = /^\/subtitles\/([^/]+)\/([^/]+?)(?:\/([^/]+))?\.json$/

function reqBase(req) {
  if (config.baseUrlOverride) return config.baseUrlOverride
  const proto = (req.headers['x-forwarded-proto'] || '').split(',')[0].trim() || req.protocol || 'http'
  return `${proto}://${req.headers.host}`
}

function subUrl(base, fileId) {
  let url = `${base}/sub/${fileId}.vtt`
  if (config.useStremioProxy) {
    url = `http://127.0.0.1:11470/subtitles.vtt?from=${encodeURIComponent(url)}`
  }
  return url
}

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

  // CORS (Stremio'nun her kaynaktan çekebilmesi için) + preflight
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    if (req.method === 'OPTIONS') return res.status(204).end()
    next()
  })
  app.use(express.json())

  // Manifest (isteğe bağlı config ön ekini de kabul et)
  app.get(/^\/(?:[^/]+\/)?manifest\.json$/, (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(manifest))
  })

  // Altyazı listesi — URL'ler isteğin Host'undan üretilir (TV/telefon için doğru)
  app.get(SUB_RE, async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    const m = req.url.match(SUB_RE)
    const type = decodeURIComponent(m[1])
    const id = decodeURIComponent(m[2])
    const extra = m[3] ? qs.parse(m[3]) : {}
    try {
      const items = await addon.findSubtitles({ type, id, extra })
      const base = reqBase(req)
      const subtitles = items.map((item, index) => {
        const tags = [`Otomatik çeviri ${index + 1}`]
        if (item.cached) tags.push('hazır ✓')
        if (item.hashMatch) tags.push('birebir senkron')
        else if (item.release) tags.push(item.release.slice(0, 30))
        return {
          id: `tr-${item.fileId}`,
          url: subUrl(base, item.fileId),
          lang: config.subtitleLang,
          label: tags.join(' • '),
        }
      })
      res.end(JSON.stringify({ subtitles, cacheMaxAge: 6 * 60 * 60 }))
    } catch (e) {
      console.error('[subtitles] hata:', e.message)
      res.end(JSON.stringify({ subtitles: [] }))
    }
  })

  // Çevrilmiş altyazı dosyası: /sub/<file_id>.vtt
  app.get(/^\/sub\/(\d+)\.vtt$/, async (req, res) => {
    const fileId = req.params[0]
    const t0 = Date.now()
    console.log(`[sub] istek geldi: file_id=${fileId}`)
    try {
      const cached = await pipeline.readCached(fileId)
      if (cached) {
        serveVtt(res, cached, { store: true })
        console.log(`[sub] cache'ten verildi: file_id=${fileId} ${cached.length} byte (${Date.now() - t0}ms)`)
        return
      }

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
      res.status(502).setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end(`Hata: ${e.message}`)
    }
  })

  // --- Hazırlık listesi API'leri ---
  app.get('/api/search', async (req, res) => {
    try {
      res.json(await meta.search(String(req.query.q || '')))
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })
  app.post('/api/prepare', async (req, res) => {
    try {
      const added = await queue.enqueue(req.body || {})
      res.json({ added })
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  })
  app.get('/api/jobs', (req, res) => res.json(queue.list()))
  app.post('/api/jobs/clear', (req, res) => {
    queue.clearFinished()
    res.json({ ok: true })
  })
  app.post('/api/jobs/retry', (req, res) => {
    queue.retryErrors()
    res.json({ ok: true })
  })

  app.get('/prepare', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(preparePage())
  })

  app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(landing(manifest))
  })

  return app
}

module.exports = { createApp }
