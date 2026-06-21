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
      return { subtitles: [], cacheMaxAge: 60 * 60 }
    }

    const top = items.slice(0, config.maxResults)
    console.log(`[subtitles] ${items.length} İngilizce altyazı bulundu; ilk ${top.length} öneriliyor:`)
    top.forEach((it, i) =>
      console.log(
        `   ${i + 1}. file_id=${it.fileId} hashMatch=${it.hashMatch} indirme=${it.downloads} release="${it.release || '-'}"`
      )
    )

    const subtitles = top.map((item, index) => {
      // Hepsi aynı dil kodu -> Stremio'da tek "Türkçe" dili altında gruplanır.
      // Varyant adını `label` belirler (subtitle variants kısmında görünür).
      const parts = [`Otomatik çeviri ${index + 1}`]
      if (item.hashMatch) parts.push('birebir senkron ✓')
      else if (item.release) parts.push(item.release.slice(0, 40))
      return {
        id: `tr-translate-${item.fileId}`,
        url: subtitleUrl(item.fileId),
        lang: config.subtitleLang,
        label: parts.join(' • '),
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
