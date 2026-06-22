'use strict'

// Stremio altyazı isteği için aday altyazıları bulur ve döndürür.
// (Stremio protokol route'u server.js içinde; burada sadece arama mantığı var.)

const fsp = require('fs/promises')
const config = require('./config')
const opensubtitles = require('./opensubtitles')
const ids = require('./ids')
const cache = require('./cache')

async function isTranslatedCached(fileId) {
  try {
    await fsp.access(cache.translatedPath(fileId, config.targetLang, config.provider))
    return true
  } catch (_) {
    return false
  }
}

// { type, id, extra } -> aday listesi [{ fileId, release, hashMatch, downloads, cached, ... }]
async function findSubtitles({ type, id, extra = {} }) {
  const parsed = ids.parse(id)
  const moviehash = extra.videoHash || extra.videohash || undefined
  console.log(
    `\n[subtitles] istek: type=${type} id=${id} hash=${moviehash || '-'} filename=${extra.filename || '-'}`
  )

  const items = await opensubtitles.search({
    imdbNumber: parsed.imdbNumber,
    season: parsed.season,
    episode: parsed.episode,
    isEpisode: parsed.isEpisode || type === 'series',
    moviehash,
  })

  if (!items.length) {
    console.log('[subtitles] İngilizce altyazı bulunamadı.')
    return []
  }

  // Çevirisi hazır (cache) olanları işaretle ve öne al (önceki sıralamayı koruyarak).
  for (const it of items) it.cached = await isTranslatedCached(it.fileId)
  items.sort((a, b) => Number(b.cached) - Number(a.cached))

  const top = items.slice(0, config.maxResults)
  console.log(`[subtitles] ${items.length} bulundu; ilk ${top.length} öneriliyor:`)
  top.forEach((it, i) =>
    console.log(
      `   ${i + 1}. file_id=${it.fileId} cached=${it.cached} hashMatch=${it.hashMatch} indirme=${it.downloads} release="${it.release || '-'}"`
    )
  )
  return top
}

module.exports = { findSubtitles }
