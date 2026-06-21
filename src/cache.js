'use strict'

const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')
const config = require('./config')

const RAW_DIR = path.join(config.cacheDir, 'raw')
const TRANSLATED_DIR = path.join(config.cacheDir, 'translated')

fs.mkdirSync(RAW_DIR, { recursive: true })
fs.mkdirSync(TRANSLATED_DIR, { recursive: true })

function safe(name) {
  return String(name).replace(/[^a-z0-9_.-]/gi, '_')
}

// İndirilen ham İngilizce altyazı (kotayı korumak için saklanır).
function rawPath(fileId) {
  return path.join(RAW_DIR, `${safe(fileId)}.srt`)
}

// Çevrilmiş VTT. Sağlayıcı + hedef dil anahtara dahil edilir ki
// sağlayıcı değişince cache çakışmasın.
function translatedPath(fileId, target, provider) {
  return path.join(TRANSLATED_DIR, `${safe(fileId)}.${safe(target)}.${safe(provider)}.vtt`)
}

async function readIfExists(filePath) {
  try {
    return await fsp.readFile(filePath)
  } catch (e) {
    if (e.code === 'ENOENT') return null
    throw e
  }
}

async function write(filePath, data) {
  await fsp.writeFile(filePath, data)
}

module.exports = { rawPath, translatedPath, readIfExists, write, RAW_DIR, TRANSLATED_DIR }
