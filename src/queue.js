'use strict'

// "Hazırlık" kuyruğu: kullanıcı izleyeceği içerikleri önceden ekler, addon arka
// planda İngilizce altyazıyı indirip çevirir ve cache'ler. Kuyruk diske kaydedilir
// (yeniden başlatmaya dayanıklı) ve tek tek (sıralı) işlenir.

const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')
const config = require('./config')
const opensubtitles = require('./opensubtitles')
const pipeline = require('./pipeline')
const meta = require('./meta')
const ids = require('./ids')

const JOBS_FILE = path.join(config.cacheDir, 'jobs.json')

let jobs = []
let working = false

function load() {
  try {
    jobs = JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8'))
  } catch (_) {
    jobs = []
  }
}
async function save() {
  try {
    await fsp.writeFile(JOBS_FILE, JSON.stringify(jobs, null, 2))
  } catch (e) {
    console.warn('[queue] kaydedilemedi:', e.message)
  }
}
load()

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function sameTarget(j, t) {
  return (
    j.imdbId === t.imdbId &&
    (j.season ?? null) === (t.season ?? null) &&
    (j.episode ?? null) === (t.episode ?? null)
  )
}

function addUnique(job) {
  const existing = jobs.find((j) => sameTarget(j, job) && j.status !== 'error')
  if (existing) return existing
  const j = {
    id: genId(),
    status: 'queued',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...job,
  }
  jobs.push(j)
  return j
}

// { type, imdbId, season?, episode?, mode?, title? } -> eklenen işler
async function enqueue({ type, imdbId, season, episode, mode, title }) {
  imdbId = String(imdbId || '').trim()
  if (!/^tt\d+$/.test(imdbId)) throw new Error('Geçersiz IMDb id (örn: tt0944947)')

  const name =
    title || (await meta.getName(type === 'series' ? 'series' : 'movie', imdbId).catch(() => imdbId))

  const added = []
  if (type === 'series' && (mode === 'series' || mode === 'season')) {
    const { episodes } = await meta.getSeriesEpisodes(imdbId)
    const wanted =
      mode === 'season' ? episodes.filter((e) => e.season === Number(season)) : episodes
    if (!wanted.length) throw new Error('Bölüm bulunamadı (sezon numarasını kontrol edin).')
    for (const ep of wanted) {
      added.push(
        addUnique({
          label: `${name} S${ep.season}E${ep.episode}`,
          type: 'series',
          imdbId,
          season: ep.season,
          episode: ep.episode,
        })
      )
    }
  } else if (type === 'series') {
    if (!season || !episode) throw new Error('Dizi için sezon ve bölüm gerekli.')
    added.push(
      addUnique({
        label: `${name} S${season}E${episode}`,
        type: 'series',
        imdbId,
        season: Number(season),
        episode: Number(episode),
      })
    )
  } else {
    added.push(addUnique({ label: name, type: 'movie', imdbId }))
  }

  await save()
  tick()
  return added
}

async function processJob(job) {
  job.status = 'working'
  job.updatedAt = Date.now()
  await save()
  console.log(`[queue] işleniyor: ${job.label}`)

  const parsed = ids.parse(job.imdbId)
  const items = await opensubtitles.search({
    imdbNumber: parsed.imdbNumber,
    season: job.season,
    episode: job.episode,
    isEpisode: job.type === 'series',
    moviehash: undefined, // önceden dosya hash'i yok; en çok indirilen/güvenilir seçilir
  })
  if (!items.length) throw new Error('İngilizce altyazı bulunamadı')

  const best = items[0]
  job.fileId = best.fileId
  job.release = best.release || ''
  await pipeline.getTranslatedVtt(best.fileId) // indir + çevir + cache
  job.status = 'done'
  job.updatedAt = Date.now()
  await save()
  console.log(`[queue] hazır: ${job.label} (file_id=${best.fileId})`)
}

async function tick() {
  if (working) return
  working = true
  try {
    while (true) {
      const job = jobs.find((j) => j.status === 'queued')
      if (!job) break
      try {
        await processJob(job)
      } catch (e) {
        job.status = 'error'
        job.error = e.message
        job.updatedAt = Date.now()
        await save()
        console.error(`[queue] hata (${job.label}): ${e.message}`)
      }
    }
  } finally {
    working = false
  }
}

function list() {
  return jobs.slice().sort((a, b) => b.createdAt - a.createdAt)
}
function clearFinished() {
  jobs = jobs.filter((j) => j.status === 'queued' || j.status === 'working')
  save()
}
function retryErrors() {
  jobs.forEach((j) => {
    if (j.status === 'error') {
      j.status = 'queued'
      j.error = null
    }
  })
  save()
  tick()
}

// Açılışta yarım kalanları yeniden kuyruğa al ve işlemeye başla.
jobs.forEach((j) => {
  if (j.status === 'working') j.status = 'queued'
})
save()
setTimeout(tick, 3000)

module.exports = { enqueue, list, clearFinished, retryErrors, tick }
