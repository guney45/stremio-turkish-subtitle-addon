'use strict'

// OpenSubtitles.com (yeni REST API) istemcisi.
// Dokümantasyon: https://opensubtitles.stoplight.io/docs/opensubtitles-api
//
// Kimlik doğrulama iki başlıkla yapılır:
//   - Api-Key:       statik uygulama anahtarı (zorunlu)
//   - Authorization: Bearer <token>  (isteğe bağlı; kullanıcı girişi yapılırsa kota artar)
// Ayrıca uygulamayı tanımlayan bir User-Agent zorunludur.

const config = require('./config')

const DEFAULT_HOST = 'https://api.opensubtitles.com'

// Oturum durumu (bellekte). Token ~24 saat geçerli.
const auth = {
  token: null,
  host: DEFAULT_HOST,
  ts: 0,
}

function baseHeaders(extra = {}) {
  const headers = {
    'Api-Key': config.openSubtitles.apiKey,
    'User-Agent': config.openSubtitles.userAgent,
    Accept: 'application/json',
    ...extra,
  }
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`
  return headers
}

function assertApiKey() {
  if (!config.openSubtitles.apiKey) {
    throw new Error(
      'OPENSUBTITLES_API_KEY tanımlı değil. .env dosyasına ekleyin ' +
        '(opensubtitles.com > Consumers bölümünden ücretsiz alınır).'
    )
  }
}

// Kullanıcı adı/parola verilmişse oturum açar (kota yükseltmek için).
async function ensureLogin() {
  const { username, password } = config.openSubtitles
  if (!username || !password) return
  if (auth.token && Date.now() - auth.ts < 23 * 60 * 60 * 1000) return

  const res = await fetch(`${DEFAULT_HOST}/api/v1/login`, {
    method: 'POST',
    headers: baseHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenSubtitles girişi başarısız (${res.status}): ${body}`)
  }
  const data = await res.json()
  auth.token = data.token
  auth.ts = Date.now()
  if (data.base_url) {
    auth.host = `https://${String(data.base_url).replace(/^https?:\/\//, '').replace(/\/+$/, '')}`
  }
}

function mapItem(item) {
  const a = item.attributes || {}
  const file = (a.files && a.files[0]) || {}
  return {
    fileId: file.file_id,
    fileName: file.file_name,
    release: a.release || '',
    lang: a.language,
    downloads: a.download_count || 0,
    hashMatch: a.moviehash_match === true || a.moviehash_match === 'true',
    hearingImpaired: !!a.hearing_impaired,
    fromTrusted: !!a.from_trusted,
    fps: a.fps,
  }
}

// İngilizce (config.sourceLang) altyazıları arar.
// params: { imdbNumber, season, episode, moviehash, isEpisode }
async function search(params) {
  assertApiKey()
  await ensureLogin().catch((e) => console.warn('OpenSubtitles giriş uyarısı:', e.message))

  const host = auth.host || DEFAULT_HOST
  const qp = new URLSearchParams()
  qp.set('languages', config.sourceLang)

  if (params.isEpisode) {
    qp.set('parent_imdb_id', params.imdbNumber)
    qp.set('season_number', String(params.season))
    qp.set('episode_number', String(params.episode))
  } else {
    qp.set('imdb_id', params.imdbNumber)
  }
  if (params.moviehash) qp.set('moviehash', String(params.moviehash).toLowerCase())

  const url = `${host}/api/v1/subtitles?${qp.toString()}`
  const res = await fetch(url, { headers: baseHeaders() })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenSubtitles arama hatası (${res.status}): ${body}`)
  }
  const data = await res.json()
  const items = ((data && data.data) || []).map(mapItem).filter((x) => x.fileId)

  // En iyi eşleşme önce: hash eşleşmesi > güvenilir yükleyici > indirme sayısı
  items.sort((x, y) => {
    if (x.hashMatch !== y.hashMatch) return x.hashMatch ? -1 : 1
    if (x.fromTrusted !== y.fromTrusted) return x.fromTrusted ? -1 : 1
    return y.downloads - x.downloads
  })

  return items
}

// Belirli bir dosya için indirme linki alır. DİKKAT: günlük kotadan düşer.
async function getDownloadLink(fileId) {
  assertApiKey()
  await ensureLogin().catch(() => {})

  const host = auth.host || DEFAULT_HOST
  const res = await fetch(`${host}/api/v1/download`, {
    method: 'POST',
    headers: baseHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ file_id: Number(fileId), sub_format: 'srt' }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenSubtitles indirme hatası (${res.status}): ${body}`)
  }
  const data = await res.json()
  if (!data || !data.link) {
    throw new Error(`OpenSubtitles indirme linki alınamadı: ${JSON.stringify(data)}`)
  }
  return data // { link, file_name, requests, remaining, message, reset_time }
}

// İndirme linkini alıp dosyanın ham içeriğini (Buffer) döndürür.
async function downloadSubtitle(fileId) {
  const info = await getDownloadLink(fileId)
  const res = await fetch(info.link, {
    headers: { 'User-Agent': config.openSubtitles.userAgent },
  })
  if (!res.ok) {
    throw new Error(`Altyazı dosyası indirilemedi (${res.status})`)
  }
  const arrayBuffer = await res.arrayBuffer()
  return { buffer: Buffer.from(arrayBuffer), info }
}

module.exports = { search, getDownloadLink, downloadSubtitle }
