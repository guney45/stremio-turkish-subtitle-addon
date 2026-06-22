'use strict'

// Cinemeta (Stremio'nun resmi, ücretsiz meta eklentisi) ile başlık arama ve
// dizi bölüm listesi çekme. Anahtar gerekmez.

const { fetchWithTimeout } = require('./util')

const CINEMETA = 'https://v3-cinemeta.strem.io'

// Başlığa göre film + dizi arar.
async function search(query) {
  const q = String(query || '').trim()
  if (!q) return []
  const results = []
  for (const type of ['movie', 'series']) {
    try {
      const url = `${CINEMETA}/catalog/${type}/top/search=${encodeURIComponent(q)}.json`
      const res = await fetchWithTimeout(url, {}, 15000)
      if (!res.ok) continue
      const data = await res.json()
      for (const m of (data.metas || []).slice(0, 8)) {
        results.push({
          id: m.id,
          type,
          name: m.name,
          year: m.releaseInfo || m.year || '',
          poster: m.poster || '',
        })
      }
    } catch (e) {
      console.warn(`[meta] arama uyarısı (${type}):`, e.message)
    }
  }
  return results
}

// Bir dizinin (imdb id) bölüm listesini döndürür.
async function getSeriesEpisodes(imdbId) {
  const url = `${CINEMETA}/meta/series/${imdbId}.json`
  const res = await fetchWithTimeout(url, {}, 15000)
  if (!res.ok) throw new Error(`Cinemeta dizi bilgisi alınamadı (${res.status})`)
  const data = await res.json()
  const meta = data.meta || {}
  const episodes = (meta.videos || [])
    .filter((v) => Number(v.season) > 0 && Number(v.episode) > 0)
    .map((v) => ({ season: Number(v.season), episode: Number(v.episode) }))
  return { name: meta.name || imdbId, episodes }
}

async function getName(type, imdbId) {
  try {
    const url = `${CINEMETA}/meta/${type}/${imdbId}.json`
    const res = await fetchWithTimeout(url, {}, 10000)
    if (!res.ok) return imdbId
    const data = await res.json()
    return (data.meta && data.meta.name) || imdbId
  } catch (_) {
    return imdbId
  }
}

module.exports = { search, getSeriesEpisodes, getName }
