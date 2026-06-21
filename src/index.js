'use strict'

const config = require('./config')
const { createApp } = require('./server')

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
}

const app = createApp()
const server = app.listen(config.port, () => {
  preflight()
  const manifestUrl = `${config.baseUrl}/manifest.json`
  console.log('\n✓ Türkçe Altyazı eklentisi çalışıyor')
  console.log(`  Karşılama sayfası : ${config.baseUrl}`)
  console.log(`  Manifest (Stremio): ${manifestUrl}`)
  console.log('  Bu manifest adresini Stremio > Eklentiler > "Add addon" kısmına yapıştırın.\n')
})

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\n[HATA] ${config.port} portu kullanımda. PORT değişkenini değiştirin.\n`)
  } else {
    console.error('Sunucu hatası:', e.message)
  }
  process.exit(1)
})
