# Katman Hız Yarışı

Modern, hafif ve tamamen **tek dosyalık (index.html)** bir yazma hızı / WPM antrenman uygulaması. Sekme içi (aynı tarayıcı) lobi desteği, canlı WPM ve doğruluk grafikleri, karakter bazlı hata ısı haritası, sezon puanı mantığı (yerel), otomatik tema & font seçenekleri, hayalet (ghost) referans koşu ve başarım sistemi içerir.

> Online (WebSocket) modu proje sadeleştirme kararıyla bu sürümde kaldırıldı. Yerel (BroadcastChannel) temelli lobi hâlâ mevcut: Aynı tarayıcıda birden fazla sekme açıp aynı lobi koduna girerek senkron yarışabilirsiniz.

## Özellikler
- Tek HTML dosyasında tüm uygulama (harici bağımlılık yok)
- WPM / Doğruluk gerçek zamanlı hesaplama
- Canlı mini WPM trend grafiği + geçmiş performans grafiği
- Hata ısı haritası (en çok hata yapılan karakterler)
- İki mod: Süreli (timed) & Sonsuz (endless)
- Zorluk türleri: short, long, mixed, code, numbers
- Türkçe / İngilizce paragraf havuzları + özel metin girişi
- Hata davranışı seçenekleri: normal, stop, block
- Otomatik başlat & otomatik yeni paragraf
- Sekme içi çoklu lobi (BroadcastChannel) — 2–10 kişi
- Senkron başlangıç (geri sayım + hedef ts) mekanizması
- Ghost (en iyi koşudan referans ilerleme)
- Başarım (achievement) sistemi
- Tema (dark, light, solarized, contrast) ve monospace seçenekleri
- Geçmiş WPM & doğruluk kaydı (son 30 tur) + JSON dışa aktarma
- Clipboard kopyalama yardımcıları (lobi kodu, geçmiş)

## Hızlı Başlangıç
1. Depoyu / klasörü indir veya kopyala.
2. `index.html` dosyasını modern bir tarayıcıyla aç (Chrome, Firefox, Edge).
3. Takma adını girip Kaydet'e tıkla.
4. Solo mod için "Solo Oyna" ya da lobi için "Lobiye Git".
5. Lobi oluştur: Ad gir -> "Yeni Lobi Oluştur" -> Kod otomatik oluşur.
6. Başka sekmede aynı kodla katıl (maks 10 sekme / oyuncu).
7. "Herkesi Başlat" (host) ile senkron geri sayım ve yarış.

> Not: Dosyayı `file://` protokolü ile açmak yeterli. İstersen basit bir HTTP statik sunucu kullan:

```powershell
# PowerShell (Python yüklüyse)
python -m http.server 8080
# Sonra http://localhost:8080/index.html
```

## Lobi Sistemi (Yerel)
- Aynı tarayıcı içinde sekmeler arası iletişim `BroadcastChannel('tsr_'+code)` kullanır.
- Lobi verisi `localStorage` içinde tutulur; sekmeler gerçek zamanlı üye listesi & ilerleme günceller.
- Host lobi silerse diğer sekmeler bilgilendirilir (`DELETED`).
- Start senkronu: Host `START` mesajında gelecekteki bir timestamp (NOW + 400ms) yayınlar, herkes aynı anda başlar.

## Ghost (Hayalet) Nasıl Çalışır?
- Geçmiş koşular içinde en yüksek WPM sonucu (metin + süre) referans alınır.
- Karakter indeksleri doğrusal zaman payı ile haritalanır (basit model).
- Yarış sırasında hayaletin o anda olması gereken karakter işaretlenir.

## Başarımlar
| ID | Koşul |
|----|-------|
| first_run | İlk skor kaydı |
| 50wpm | >= 50 WPM |
| 80wpm | >= 80 WPM |
| 100wpm | >= 100 WPM |
| no_error | %100 doğruluk |
| streak3 | Son 3 koşu >= 40 WPM |

Veriler `localStorage: tsr_achievements_v1` içinde saklanır.

## Depolama Anahtarları
| Key | Amaç |
|-----|------|
| tsr_profile_v1 | Kullanıcı profil (id + name) |
| tsr_history_v1 | Son 30 skor geçmişi |
| tsr_lobby_v1 | Aktif lobi kodu |
| tsr_lobbies_v1 | Lobi meta + üyeler |
| tsr_leaderboards_v1 | Lobi bazlı liderlik listeleri |
| tsr_ghost_v1 | Ghost referans verisi |
| tsr_achievements_v1 | Başarım durumları |

## Klavye Kısayolları
| Kısayol | İşlev |
|---------|-------|
| ESC | Sıfırla / iptal |
| Tab | Yeni paragraf (devre dışı seçilebilir) |
| Alt+L | Lobi görünümü |
| Alt+G | Oyun görünümü |

## Yapı / Kod Organizasyonu
Tek dosyada (index.html) şu bloklar:
- CSS (tema + layout + bileşenler)
- HTML (lobi paneli, oyun paneli, istatistikler)
- JS
  - Paragraf havuzları
  - Config & tema uygulama
  - Oyun döngüsü (state, tick, WPM/accuracy hesaplama)
  - Grafik çizimleri (canvas ring + geçmiş + canlı WPM)
  - Ghost / word timing
  - Lobi yerel senkron (BroadcastChannel)
  - Liderlik ve başarımlar
  - Hata ısı haritası
  - Export / clipboard yardımcıları

## Geliştirme İpuçları
- Refaktör istersen `index.html` içinden JS kodlarını modüler hale getirip `src/` altına bölebilirsin.
- Canvas çizimlerinde performans: Yalnızca gerekli olduğunda yeniden boyutlandır (mevcut mantık bunu yapıyor).
- Uzun vadede online modu tekrar eklemek istersen geçmiş WebSocket yapısını ayrı bir `client.js` içinde konumlandırman temiz olur.

## Olası Gelecek İyileştirmeler
- Gerçek sunucu destekli online lobi (yeniden)
- Sunucu doğrulamalı skor tablosu (anti-cheat)
- Çok dillilik için JSON sözlük dosyaları
- Mobil dokunmatik optimizasyonları
- Hedef metin içinde dinamik zor kelime renklendirme
- Kişiselleştirilmiş antrenman (en çok hata yapılan karakterleri yoğun içeren paragraf üretimi)

## Sorun Giderme
| Belirti | Çözüm |
|---------|-------|
| Lobi görünmüyor / senkron değil | Sekmeyi yenile; lobi meta verisi bozulduysa `localStorage` temizle. |
| Ghost görünmüyor | Önce en az 1 tam koşu yap; en iyi koşu kaydı olmalı. |
| WPM düşük hesaplanıyor | 5 karakter = 1 kelime standardı; bu normal. |

## Lisans
(Lisans belirtmek istiyorsan buraya ekle. Örn: MIT)

---
İyi yarışlar! Geliştirme fikirlerin veya hata raporların için issue / mesaj bırakabilirsin.
