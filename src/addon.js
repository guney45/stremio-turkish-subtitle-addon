'use strict'

const { addonBuilder } = require('stremio-addon-sdk')
const manifest = require('./manifest')
const config = require('./config')
const opensubtitles = require('./opensubtitles')
const ids = require('./ids')

const builder = new addonBuilder(manifest)

// Çevrilmiş altyazıyı servis edeceğimiz kendi URL'imiz.
function subtitleUrl(fileId) {
  let url = `${config.baseUrl}/sub/${fileId}.vtt`
  if (config.useStremioProxy) {
    // Stremio'nun yerel sunucusu kodlamayı düzeltsin (Türkçe karakter sorunları için)
    url = `http://127.0.0.1:11470/subtitles.vtt?from=${encodeURIComponent(url)}`
  }
  return url
}

builder.defineSubtitlesHandler(async (args) => {
  const { type, id, extra = {} } = args
  try {
    const parsed = ids.parse(id)
    const moviehash = extra.videoHash || extra.videohash || undefined

    const items = await opensubtitles.search({
      imdbNumber: parsed.imdbNumber,
      season: parsed.season,
      episode: parsed.episode,
      isEpisode: parsed.isEpisode || type === 'series',
      moviehash,
    })

    if (!items.length) {
      return { subtitles: [], cacheMaxAge: 60 * 60 }
    }

    const top = items.slice(0, config.maxResults)
    const subtitles = top.map((item, index) => {
      // İlk (en iyi) eşleşme ISO kodu ile -> Stremio "Türkçe" olarak tanır ve
      // dil tercihine göre otomatik seçebilir. Alternatifler açıklayıcı etiketle.
      let lang
      if (index === 0) {
        lang = config.subtitleLang
      } else {
        const tag = item.hashMatch ? 'birebir senkron' : item.release ? item.release.slice(0, 40) : `kaynak ${index + 1}`
        lang = `Türkçe (çeviri) • ${tag}`
      }
      return {
        id: `tr-translate-${item.fileId}`,
        url: subtitleUrl(item.fileId),
        lang,
      }
    })

    // Liste kısa süre cache'lensin; çeviri asıl dosya çekilince yapılır.
    return { subtitles, cacheMaxAge: 6 * 60 * 60 }
  } catch (e) {
    console.error('[subtitles] hata:', e.message)
    return { subtitles: [] }
  }
})

module.exports = builder.getInterface()
