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

module.exports = { chunk, mapLimit, sleep }
