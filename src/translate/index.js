'use strict'

// Pluggable çeviri katmanı. Yeni bir sağlayıcı eklemek için:
//   - { translate(lines, { source, target }) -> Promise<string[]> } imzalı modül yaz
//   - aşağıdaki providers tablosuna ekle
// Hepsi giriş satır dizisiyle aynı uzunlukta dizi döndürmelidir.

const config = require('../config')

const providers = {
  libretranslate: require('./libretranslate'),
  google: require('./google'),
  deepl: require('./deepl'),
  mymemory: require('./mymemory'),
}

function getProvider(name) {
  const key = (name || config.provider || 'libretranslate').toLowerCase()
  const provider = providers[key]
  if (!provider) {
    throw new Error(
      `Bilinmeyen çeviri sağlayıcısı: "${key}". Geçerli seçenekler: ${Object.keys(providers).join(', ')}`
    )
  }
  return provider
}

// lines: string[] -> string[] (sıra korunur)
async function translateLines(lines, opts = {}) {
  if (!lines.length) return []
  const provider = getProvider(opts.provider)
  const source = opts.source || config.sourceLang
  const target = opts.target || config.targetLang
  const result = await provider.translate(lines, { source, target })
  if (!Array.isArray(result) || result.length !== lines.length) {
    throw new Error(
      `Çeviri sağlayıcısı (${provider.id}) beklenenden farklı sayıda satır döndürdü ` +
        `(${Array.isArray(result) ? result.length : 'dizi değil'} / ${lines.length}).`
    )
  }
  return result
}

module.exports = { translateLines, getProvider, providers }
