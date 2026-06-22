'use strict'

const config = require('./config')
const { createApp } = require('./server')
const { sleep } = require('./util')

function preflight() {
  if (!config.openSubtitles.apiKey) {
    console.warn(
      '\n[UYARI] OPENSUBTITLES_API_KEY tanımlı değil — altyazı araması çalışmaz.\n' +
        '  .env dosyanıza ekleyin (opensubtitles.com > Consumers).\n'
    )
  }
  if (config.provider === 'libretranslate') {
    console.log(`[bilgi] Çeviri: LibreTranslate @ ${config.libreTranslate.url}`)
  } else {
    console.log(`[bilgi] Çeviri sağlayıcısı: ${config.provider}`)
  }
  if (!config.baseUrlOverride) {
    console.log('[bilgi] BASE_URL ayarlı değil — altyazı adresleri isteğin Host\'undan türetilecek (TV/telefon için önerilir).')
  } else {
    console.log(`[bilgi] BASE_URL sabit: ${config.baseUrlOverride}`)
  }
}

// LibreTranslate'in gerçekten çalıştığını doğrular ve modeli önceden ısıtır.
async function libreTranslateSelfTest() {
  if (config.provider !== 'libretranslate') return
  const { translateLines } = require('./translate')
  for (let attempt = 1; attempt <= 12; attempt++) {
    try {
      const out = await translateLines(['Hello, world.'], {
        source: config.sourceLang,
        target: config.targetLang,
      })
      console.log(`[self-test] LibreTranslate çalışıyor ✓  "Hello, world." -> "${out[0]}"`)
      return
    } catch (e) {
      if (attempt === 1) {
        console.log('[self-test] LibreTranslate henüz hazır değil (model iniyor olabilir), bekleniyor...')
      }
      await sleep(5000)
    }
  }
  console.warn('[self-test] LibreTranslate ~1 dk içinde yanıt vermedi. `docker compose logs libretranslate` ile kontrol edin.')
}

const app = createApp()
const server = app.listen(config.port, () => {
  preflight()
  console.log('\n✓ Türkçe Altyazı eklentisi çalışıyor')
  console.log(`  Karşılama sayfası : ${config.baseUrlDisplay}`)
  console.log(`  Hazırlık listesi  : ${config.baseUrlDisplay}/prepare`)
  console.log(`  Manifest (Stremio): ${config.baseUrlDisplay}/manifest.json`)
  console.log('  TV/telefon için bu adresleri bilgisayarınızın LAN IP\'siyle açın.\n')
  libreTranslateSelfTest()
})

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\n[HATA] ${config.port} portu kullanımda. PORT değişkenini değiştirin.\n`)
  } else {
    console.error('Sunucu hatası:', e.message)
  }
  process.exit(1)
})
