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

Bir film/dizi açtığında altyazı listesinde tek bir **Türkçe** dili altında
**"Otomatik çeviri 1 / 2 / 3"** varyantları görünür. (Bu bir **altyazı** eklentisidir;
Keşfet/Discover ekranında kendi satırı **olmaz** — içerik oynatıp altyazı menüsüne bak.)
İlk seçimde çeviri hazırlanır; beklememek için aşağıdaki **Hazırlık Listesi**'ni kullan.

---

## 🗂️ Hazırlık listesi (önceden çevir)

İlk seçimde beklememek için izleyeceklerini önceden hazırlayabilirsin:

1. Tarayıcıda **`/prepare`** sayfasını aç (ör. `http://127.0.0.1:7700/prepare`) — ana
   sayfadaki **"Hazırlık Listesi"** düğmesinden de gidebilirsin.
2. Film/dizi adını ara, **Hazırla** de (dizide: **Bölüm / Sezon / Tüm dizi**).
3. Addon arka planda İngilizceyi indirip Türkçeye çevirir ve diske kaydeder; kuyruktaki
   durumları (Sırada / Çevriliyor / **Hazır ✓**) aynı sayfada görürsün.
4. İzlerken o altyazı **"hazır ✓"** etiketiyle ve anında gelir.

> Sezon/tüm dizi eklemek çok sayıda OpenSubtitles indirmesi yapar (günlük kotaya dikkat;
> kullanıcı adı/parola girersen kota yükselir).

---

## Telefondan / TV'den izlemek (LG, Android TV vb.)

Eklenti **bilgisayarında** çalışır; başka cihazın (TV/telefon) ona ağ üzerinden
ulaşması gerekir. Altyazı adresleri artık isteğin geldiği yerden otomatik türetilir,
bu yüzden tek kural: **eklentiyi `127.0.0.1` ile değil, bilgisayarının LAN IP'siyle ekle.**

1. **`.env`'de `BASE_URL` satırını sil/yorum yap** (boşsa adres otomatik türetilir),
   sonra `docker compose up -d`.
2. Bilgisayarının LAN IP'sini öğren: Windows `ipconfig`, macOS `ipconfig getifaddr en0`,
   Linux `hostname -I` (ör. `192.168.1.20`).
3. **Başka cihazdan test et:** tarayıcıda `http://192.168.1.20:7700/manifest.json`
   açılıyor mu? Açılıyorsa LAN erişimi tamam. (Açılmıyorsa: aynı ağ mı? güvenlik duvarı 7700'e izin veriyor mu?)
4. Bilgisayardaki/web Stremio'da **eski 127.0.0.1 eklentisini kaldır**, eklentiyi
   `http://192.168.1.20:7700/manifest.json` ile **yeniden ekle**.
5. **Aynı Stremio hesabıyla** TV'ye giriş yap; eklenti senkronla TV'ye gelir.
6. Doğrula: TV'de bir şey oynat, **altyazı menüsünden** "Türkçe / Otomatik çeviri"yi seç.

**LG C5 (webOS) notu:** "Successfully synced" eklentinin TV hesabına geldiğini gösterir;
yine de görünmüyorsa sebep neredeyse her zaman adresin **`127.0.0.1`** olması ya da TV'nin
bilgisayara ulaşamamasıdır (yukarıdaki 1-4). Bilgisayar açık ve aynı ağda olmalı.

---

## Yapılandırma (.env)

| Değişken | Açıklama | Varsayılan |
|---|---|---|
| `PORT` | Eklentinin dinlediği port | `7000` |
| `BASE_URL` | Altyazı taban adresi. **Boş** = isteğin Host'undan otomatik (TV/telefon için önerilir) | _(boş)_ |
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

- **İlk seçimde "⏳ Türkçe çeviri hazırlanıyor…" görünüyor:** Normaldir. Bir altyazıyı
  ilk kez seçtiğinde tüm dosya çevrilir (CPU'da ~1-3 dk). Loglarda `[pipeline] TAMAM`
  satırını görünce altyazıyı kapatıp tekrar seç; tam Türkçe altyazı gelir ve artık
  beklemezsin (önbelleğe alınır, tekrar izleme/ileri sarma anında). Hız için Docker
  Desktop'ta CPU/RAM'i artır ya da daha hızlı bir sağlayıcı (DeepL/Google) seç.
- **`bind: address already in use` / port 5000 veya 7000 hatası (macOS):** macOS'ta
  bu portları "AirPlay Receiver" kullanır. İki çözüm: (1) **Sistem Ayarları → Genel →
  AirDrop ve Handoff → AirPlay Alıcısı**'nı kapat (en kolay, varsayılan portlar çalışır),
  veya (2) `.env`'de `ADDON_HOST_PORT=7700` (+ `BASE_URL=http://127.0.0.1:7700`) ve
  gerekirse `LT_HOST_PORT=5050` ayarla, sonra `docker compose down && docker compose up -d`.
- **`container libretranslate is unhealthy` / `Permission denied: .../argos-translate`:**
  Eski/bozuk model volume'undan kaynaklanır. Volume'u sıfırlayıp yeniden başlat:
  `docker compose down -v && docker compose up -d`. İlk açılışta model indirileceği
  için `docker compose logs -f libretranslate` ile hazır olmasını bekle.
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
