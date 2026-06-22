'use strict'

require('dotenv').config()
const path = require('path')

function bool(value, fallback = false) {
  if (value == null || value === '') return fallback
  return /^(1|true|yes|on)$/i.test(String(value).trim())
}

function int(value, fallback) {
  const n = parseInt(value, 10)
  return Number.isFinite(n) ? n : fallback
}

const port = int(process.env.PORT, 7000)
const baseUrlOverride = (process.env.BASE_URL || '').replace(/\/+$/, '')

const config = {
  port,
  // BASE_URL verilmişse onu kullan; verilmezse altyazı URL'leri gelen isteğin
  // Host başlığından türetilir (farklı cihazlar -TV/telefon- için otomatik doğru adres).
  baseUrlOverride,
  baseUrlDisplay: baseUrlOverride || `http://127.0.0.1:${port}`,

  sourceLang: (process.env.SOURCE_LANG || 'en').toLowerCase(),
  targetLang: (process.env.TARGET_LANG || 'tr').toLowerCase(),
  // Stremio'da gösterilen dil etiketi (ISO 639-2). Çeviri hedefinden bağımsız.
  subtitleLang: (process.env.SUBTITLE_LANG || 'tur').toLowerCase(),

  maxResults: Math.max(1, int(process.env.MAX_RESULTS, 3)),
  translateConcurrency: Math.max(1, int(process.env.TRANSLATE_CONCURRENCY, 4)),
  // Tek çeviri isteğinde gönderilecek satır sayısı (büyük olması verimi artırır)
  translateBatchSize: Math.max(1, int(process.env.TRANSLATE_BATCH_SIZE, 100)),
  // Tek çeviri isteği için zaman aşımı
  translateTimeoutMs: int(process.env.TRANSLATE_TIMEOUT_MS, 120000),
  // /sub isteğinde çeviri için en fazla ne kadar beklensin (aşılırsa placeholder döner,
  // çeviri arka planda sürer). Stremio'nun kendi zaman aşımının altında tutun.
  subWaitMs: int(process.env.SUB_WAIT_MS, 15000),
  cacheDir: path.resolve(process.env.CACHE_DIR || path.join(process.cwd(), '.cache')),
  cacheMaxAge: int(process.env.CACHE_MAX_AGE, 7 * 24 * 60 * 60),
  useStremioProxy: bool(process.env.USE_STREMIO_PROXY, false),

  openSubtitles: {
    apiKey: (process.env.OPENSUBTITLES_API_KEY || '').trim(),
    username: (process.env.OPENSUBTITLES_USERNAME || '').trim(),
    password: (process.env.OPENSUBTITLES_PASSWORD || '').trim(),
    userAgent: (process.env.OPENSUBTITLES_USER_AGENT || 'TurkishSubsTranslator v1.0').trim(),
  },

  provider: (process.env.TRANSLATE_PROVIDER || 'libretranslate').toLowerCase().trim(),

  libreTranslate: {
    url: (process.env.LIBRETRANSLATE_URL || 'http://127.0.0.1:5000').replace(/\/+$/, ''),
    apiKey: (process.env.LIBRETRANSLATE_API_KEY || '').trim(),
  },

  deepl: {
    apiKey: (process.env.DEEPL_API_KEY || '').trim(),
    free: bool(process.env.DEEPL_FREE, true),
  },

  mymemory: {
    email: (process.env.MYMEMORY_EMAIL || '').trim(),
  },
}

module.exports = config
