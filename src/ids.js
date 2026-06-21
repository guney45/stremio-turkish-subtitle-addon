'use strict'

// Stremio video id biçimleri:
//   film:  "tt1254207"
//   dizi:  "tt0944947:1:5"  ->  imdbId : sezon : bölüm
function parse(id) {
  const raw = String(id || '')
  const parts = raw.split(':')
  const imdbId = parts[0]
  // OpenSubtitles "imdb_id" alanı sayısal ister: "tt0133093" -> "133093"
  const imdbNumber = imdbId.replace(/^tt/i, '').replace(/^0+(?=\d)/, '')
  const season = parts[1] != null && parts[1] !== '' ? parseInt(parts[1], 10) : undefined
  const episode = parts[2] != null && parts[2] !== '' ? parseInt(parts[2], 10) : undefined
  return {
    imdbId,
    imdbNumber,
    season: Number.isFinite(season) ? season : undefined,
    episode: Number.isFinite(episode) ? episode : undefined,
    isEpisode: Number.isFinite(season) && Number.isFinite(episode),
  }
}

module.exports = { parse }
