'use strict'

module.exports = {
  id: 'com.guney.turkishsubs.translate',
  version: '1.0.0',
  name: 'Türkçe Altyazı (Otomatik Çeviri)',
  description:
    "İyi senkronlu İngilizce altyazıları OpenSubtitles'tan bulur ve zaman " +
    'damgalarını aynen koruyarak Türkçeye çevirir. Böylece kayma sorunu ' +
    'yaşamadan otomatik Türkçe altyazı elde edersiniz. (Kişisel kullanım için.)',
  resources: ['subtitles'],
  types: ['movie', 'series'],
  catalogs: [],
  idPrefixes: ['tt'],
  behaviorHints: {
    configurable: false,
    p2p: false,
  },
}
