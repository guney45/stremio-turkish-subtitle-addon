'use strict'

// Diziyi `size` uzunluğunda parçalara böler.
function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// Eşzamanlılık sınırlı async map. Sırayı korur.
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let cursor = 0
  const size = Math.max(1, Math.min(limit, items.length || 1))
  const workers = new Array(size).fill(0).map(async () => {
    while (true) {
      const index = cursor++
      if (index >= items.length) break
      results[index] = await fn(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Zaman aşımlı fetch (sonsuza kadar asılı kalmayı önler).
async function fetchWithTimeout(url, options = {}, timeoutMs = 60000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (e) {
    if (e && e.name === 'AbortError') {
      throw new Error(`İstek zaman aşımına uğradı (${timeoutMs}ms)`)
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

module.exports = { chunk, mapLimit, sleep, fetchWithTimeout }
