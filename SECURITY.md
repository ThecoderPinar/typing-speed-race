# Güvenlik Politikası

## Raporlama
Güvenlik açığını herkese açık issue olarak yazma. Bunun yerine (örn. e‑posta / DM) özel kanaldan bildir. Kamuya açık bir yol eklemek istersen buraya adres koy.

Önerilen bilgiler:
- Açığın kısa açıklaması
- Etkilenen sürüm veya commit hash
- Tekrarlama adımları
- Olası etki (veri ifşası, XSS, yerel storage manipülasyonu vb.)

## Kapsam
Bu proje yalnızca istemci tarafı (client-side) çalışır; saldırı yüzeyi:
- XSS: Özel metin girişleri
- localStorage manipülasyonu
- BroadcastChannel kötüye kullanım senaryoları

## Azaltma
- Kullanıcı girdileri (lobi adı, özel metin, takma ad) yazılırken temel HTML kaçış (escape) uygulanır.
- Kod çalıştıran eval / new Function kullanılmaz.
- localStorage anahtar isimleri prefix'li; çarpışma olasılığı düşük.

## Yapılacaklar
- Uzun vadede içerik güvenlik politikası (CSP) header (HTTP sunumunda) önerilir.
- Özel metin için uzunluk sınırlarının artırılmış doğrulaması.
- Anti hile mantığının istemci tarafı heuristik yerine sunucuya taşınması (ileride online mod eklenirse).

## Sorumluluk Reddi
Bu proje deneysel. Kritik veriler için kullanma.
