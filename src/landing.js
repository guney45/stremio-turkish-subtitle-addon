'use strict'

const config = require('./config')

// Basit, Türkçe karşılama / kurulum sayfası.
function landing(manifest) {
  const manifestUrl = `${config.baseUrl}/manifest.json`
  const stremioDeepLink = manifestUrl.replace(/^https?:\/\//, 'stremio://')
  const providerLabel =
    config.provider === 'libretranslate'
      ? `LibreTranslate (${config.libreTranslate.url})`
      : config.provider
  const apiKeyOk = config.openSubtitles.apiKey ? '✓ tanımlı' : '✗ EKSİK (.env içine ekleyin)'

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${manifest.name}</title>
<style>
  :root { color-scheme: dark; }
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
         background:#0e0f13; color:#e6e6e6; margin:0; padding:0; }
  .wrap { max-width:720px; margin:0 auto; padding:48px 24px; }
  h1 { font-size:1.7rem; margin:0 0 8px; }
  p.desc { color:#a8b0bd; line-height:1.6; }
  .card { background:#171922; border:1px solid #262a36; border-radius:14px;
          padding:20px 22px; margin:22px 0; }
  code { background:#0b0c10; padding:3px 8px; border-radius:6px; font-size:.92rem;
         word-break:break-all; color:#9ad1ff; }
  .btn { display:inline-block; background:#6f4cff; color:#fff; text-decoration:none;
         padding:12px 22px; border-radius:10px; font-weight:600; margin-top:6px; }
  .row { display:flex; justify-content:space-between; gap:12px; padding:6px 0;
         border-bottom:1px solid #21242f; }
  .row:last-child { border-bottom:0; }
  .k { color:#a8b0bd; }
  ol { line-height:1.8; color:#cfd5e0; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>🇹🇷 ${manifest.name}</h1>
    <p class="desc">${manifest.description}</p>

    <div class="card">
      <p>Stremio'ya eklemek için aşağıdaki düğmeye tıklayın veya manifest adresini
      Stremio'da <b>Eklentiler &rarr; Add addon</b> kısmına yapıştırın:</p>
      <p><a class="btn" href="${stremioDeepLink}">Stremio'ya Ekle</a></p>
      <p style="margin-top:14px"><code>${manifestUrl}</code></p>
    </div>

    <div class="card">
      <div class="row"><span class="k">Çeviri sağlayıcısı</span><span>${providerLabel}</span></div>
      <div class="row"><span class="k">OpenSubtitles API anahtarı</span><span>${apiKeyOk}</span></div>
      <div class="row"><span class="k">Hedef dil</span><span>${config.targetLang} (${config.subtitleLang})</span></div>
    </div>

    <div class="card">
      <b>Nasıl çalışır?</b>
      <ol>
        <li>OpenSubtitles'tan, oynattığınız dosyaya birebir uyan İngilizce altyazıyı bulur.</li>
        <li>Zaman damgalarını aynen koruyarak metni Türkçeye çevirir.</li>
        <li>Sonucu önbelleğe alır; aynı bölümü tekrar açınca anında gelir.</li>
      </ol>
    </div>
  </div>
</body>
</html>`
}

module.exports = landing
