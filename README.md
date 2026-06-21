# 🇹🇷 Stremio Türkçe Altyazı Eklentisi (Otomatik Çeviri)

Stremio'da Türkçe altyazı bulmanın derdine çözüm: **iyi senkronlu İngilizce
altyazıları bulur ve zaman damgalarını _aynen_ koruyarak Türkçeye çevirir.**

Türkçe altyazılar genelde kayık olur; İngilizce altyazılar ise hem bol hem de
düzgün senkronludur. Bu eklenti, oynattığın dosyaya **birebir uyan** İngilizce
altyazıyı OpenSubtitles'tan alır, sadece metni çevirir, zamanlamaya dokunmaz.
Sonuç: **kaymayan, otomatik Türkçe altyazı.**

> Kişisel kullanım içindir. Tamamen **açık kaynak ve ücretsiz** araçlar kullanır,
> ücretli veya yasa dışı hiçbir bileşen içermez.

---

## Nasıl çalışır?

```
Stremio  ──(IMDb id + sezon/bölüm + dosya hash'i)──▶  Eklenti (bilgisayarında)
                                                          │
   1) OpenSubtitles'ta hash ile birebir eşleşen EN altyazıyı ara
   2) Altyazıyı seçince  →  indir  →  gzip aç  →  UTF-8'e çevir
   3) SRT'yi parçalara ayır  →  SADECE metni çevir (zaman damgaları sabit)
   4) LibreTranslate ile EN→TR  →  diske önbellekle
   5) Temiz UTF-8 .vtt olarak Stremio'ya ver
```

Ağır iş (indirme + çeviri) yalnızca altyazıyı **seçtiğin an** yapılır ve
önbelleğe alınır. Aynı bölümü tekrar açtığında anında gelir; OpenSubtitles
günlük kotan da boşa harcanmaz.

---

## Gereksinimler

- **Node.js 18+** (eklentiyi çalıştırmak için)
- **OpenSubtitles** ücretsiz hesabı + API anahtarı (İngilizce altyazı kaynağı)
- **LibreTranslate** (çeviri motoru) — Docker veya `pip` ile çalışır
- İsteğe bağlı: **Docker** (her şeyi tek komutla ayağa kaldırmak için)

---

## Kurulum

### 1) OpenSubtitles API anahtarı al (ücretsiz)

1. <https://www.opensubtitles.com> adresinde ücretsiz bir hesap aç.
2. Profilinden **"Consumers" / "API Consumers"** bölümüne git, yeni bir uygulama
   oluştur. Sana bir **API Key** verilecek.
3. (Önerilir) `.env` dosyasına kullanıcı adı + parolanı da girersen günlük
   indirme kotan yükselir (anonimde ~5/gün; giriş yapınca çok daha fazla).

### 2) Yapılandırma dosyasını oluştur

```bash
cp .env.example .env
```

`.env` içindeki şu alanları doldur (en azından API anahtarı):

```ini
OPENSUBTITLES_API_KEY=buraya_api_anahtarın
OPENSUBTITLES_USERNAME=kullanıcı_adın      # opsiyonel ama önerilir
OPENSUBTITLES_PASSWORD=parolan             # opsiyonel ama önerilir
```

### 3) Çalıştır

İki yol var. **A** en kolayı (her şey Docker'da), **B** ise Node'u elle çalıştırır.

#### A) Tek komutla (Docker — önerilen)

LibreTranslate + eklenti birlikte ayağa kalkar:

```bash
docker compose up -d
```

> İlk açılışta LibreTranslate, İngilizce/Türkçe çeviri modelini indirir
> (bir defalık, internet gerekir). Sonrasında tamamen çevrimdışı çalışır.
> Hazır olduğunu `docker compose logs -f libretranslate` ile görebilirsin.

#### B) Elle (Node + ayrı LibreTranslate)

Önce çeviri sunucusunu başlat (ikisinden biri):

```bash
# Docker ile sadece çeviri sunucusu:
docker compose up -d libretranslate

# VEYA Docker'sız, pip ile:
pip install libretranslate
libretranslate --load-only en,tr
```

Sonra eklentiyi başlat:

```bash
npm install
npm start
```

Şunu göreceksin:

```
✓ Türkçe Altyazı eklentisi çalışıyor
  Manifest (Stremio): http://127.0.0.1:7000/manifest.json
```

### 4) Stremio'ya ekle

- Tarayıcıda <http://127.0.0.1:7000> aç, **"Stremio'ya Ekle"** düğmesine bas, **veya**
- Stremio'da **Eklentiler → "Add addon"** kısmına şu adresi yapıştır:
  `http://127.0.0.1:7000/manifest.json`

Artık bir film/dizi açtığında altyazı listesinde **Türkçe** seçeneği belirir.
Seçtiğinde birkaç saniye içinde çevrilip gelir (ilk seferde; sonra anında).

---

## Telefondan / başka cihazdan izlemek

Eklenti bilgisayarında çalışıyor ama Stremio'yu başka cihazda (telefon, TV)
kullanıyorsan, o cihazın altyazı dosyasını bilgisayarından çekebilmesi gerekir.
`.env` içindeki `BASE_URL`'i bilgisayarının yerel ağ (LAN) IP'siyle değiştir:

```ini
BASE_URL=http://192.168.1.20:7000
```

(IP'ni `ipconfig`/`ifconfig` ile öğrenebilirsin. Cihazlar aynı ağda olmalı.)

---

## Yapılandırma (.env)

| Değişken | Açıklama | Varsayılan |
|---|---|---|
| `PORT` | Eklentinin dinlediği port | `7000` |
| `BASE_URL` | Stremio'nun altyazıyı çekeceği adres | `http://127.0.0.1:7000` |
| `OPENSUBTITLES_API_KEY` | **Zorunlu.** OpenSubtitles API anahtarı | – |
| `OPENSUBTITLES_USERNAME` / `_PASSWORD` | Kota yükseltmek için (opsiyonel) | – |
| `TRANSLATE_PROVIDER` | `libretranslate` \| `google` \| `deepl` \| `mymemory` | `libretranslate` |
| `LIBRETRANSLATE_URL` | LibreTranslate adresi | `http://127.0.0.1:5000` |
| `TARGET_LANG` | Çeviri hedef dili | `tr` |
| `SUBTITLE_LANG` | Stremio'da gösterilen dil kodu (ISO 639-2) | `tur` |
| `MAX_RESULTS` | Önerilecek altyazı adayı sayısı | `3` |
| `USE_STREMIO_PROXY` | Türkçe karakter sorununda kodlama düzeltmesi | `false` |

Tam liste için `.env.example` dosyasına bak.

---

## Çeviri motorunu değiştirmek

Hepsi pluggable. `.env` içindeki `TRANSLATE_PROVIDER` değerini değiştir:

- **`libretranslate`** (varsayılan) — Açık kaynak, ücretsiz, çevrimdışı, sınırsız.
  En çok bu senaryoya uygun olanı.
- **`deepl`** — Çok iyi Türkçe kalite. `DEEPL_API_KEY` gerekir (ücretsiz: ayda
  500K karakter).
- **`google`** — Resmi olmayan ücretsiz uç; kalite iyi ama Google şartlarına göre
  gri alan, yoğun kullanımda geçici engellenebilir.
- **`mymemory`** — Anahtarsız ücretsiz API; günlük kelime limiti var, tam film
  için sınır aşılabilir (daha çok yedek/deneme amaçlı).

Yeni bir sağlayıcı eklemek istersen: `src/translate/` altına
`translate(lines, { source, target }) → Promise<string[]>` imzalı bir modül
ekleyip `src/translate/index.js` içindeki tabloya kaydetmen yeterli.

---

## Sorun giderme

- **Altyazı listesinde Türkçe çıkmıyor:** `.env` içindeki `OPENSUBTITLES_API_KEY`
  dolu mu? Konsolda uyarı var mı? İçeriğin İngilizce altyazısı OpenSubtitles'ta
  mevcut mu?
- **"LibreTranslate'e bağlanılamadı":** Çeviri sunucusu çalışıyor mu?
  `docker compose up -d libretranslate` ve `LIBRETRANSLATE_URL` doğru mu?
- **Türkçe karakterler bozuk (ç, ğ, ı, ş...):** `.env` içinde
  `USE_STREMIO_PROXY=true` yap (Stremio'nun yerel sunucusu kodlamayı düzeltir).
- **"OpenSubtitles indirme hatası" / kota:** Günlük indirme limitine takılmış
  olabilirsin. `.env`'e kullanıcı adı/parola ekleyerek limiti yükselt. Daha önce
  indirilenler `.cache/` içinde tutulduğu için tekrar indirilmez.
- **Çeviri kalitesi düşük:** Daha iyi Türkçe için `TRANSLATE_PROVIDER=deepl`
  (ücretsiz anahtarla) dene.

---

## Geliştirme

```bash
npm install
npm test        # birim testleri (altyazı ayrıştırma, id, yardımcılar)
npm run dev     # dosya değişince otomatik yeniden başlatma
```

### Proje yapısı

```
src/
  index.js            # giriş noktası (HTTP sunucusunu başlatır)
  server.js           # Express app: addon router + /sub dosya servisi + landing
  addon.js            # Stremio altyazı handler'ı (OpenSubtitles araması)
  manifest.js         # eklenti manifesti
  opensubtitles.js    # OpenSubtitles REST API istemcisi (arama/login/indirme)
  subtitles.js        # SRT/VTT ayrıştırma + VTT üretme + kodlama çözme
  pipeline.js         # indir → çevir → önbellekle akışı (dedupe'lu)
  cache.js            # disk önbelleği (ham EN + çevrilmiş TR)
  ids.js              # Stremio video id ayrıştırma (film / dizi)
  util.js             # chunk, mapLimit (eşzamanlılık)
  translate/
    index.js          # sağlayıcı seçici
    libretranslate.js # varsayılan (açık kaynak, çevrimdışı)
    deepl.js / google.js / mymemory.js   # opsiyonel sağlayıcılar
```

---

## Lisans

MIT. Kullanılan başlıca açık kaynak bileşenler: [stremio-addon-sdk](https://github.com/Stremio/stremio-addon-sdk)
(MIT), [LibreTranslate](https://github.com/LibreTranslate/LibreTranslate) (AGPL),
[Argos Translate](https://github.com/argosopentech/argos-translate) (MIT).
Altyazılar [OpenSubtitles](https://www.opensubtitles.com) üzerinden, kendi
ücretsiz API anahtarınla çekilir.
