# DEVİR NOTU — KPSS Asistanım (yeni sohbet için)

## Proje
- Repo: `/home/user/kpssasistani-mobil` — Expo/React Native (SDK 57), web çıktısı `dist/`, Vercel canlı: https://kpssasistani-mobil.vercel.app
- Supabase: https://kticjymkypqjljjkiwvh.supabase.co (ref `kticjymkypqjljjkiwvh`)
- GitHub: https://github.com/0xinspectorx0/kpssasistani-mobil

## Git durumu (2026-09-26 itibarıyla)
- Uygulama geliştirme tabanı `4282d93`; sonrasında HANDOFF dosyası eklenmiş ve ana dala içerik aktarımı fallback'i eklenmiştir.
- Yeni oturumda başlangıç dalının `origin/main` ile eşit olduğunu `git log -1` ve `git status` ile kontrol et.
- Dallar: `main`, `ilk-surdum` (PR baz dalı, ilk commit `0ee804d`)
- PR açmak için tek tıklık link: https://github.com/0xinspectorx0/kpssasistani-mobil/compare/ilk-surdum...main
- **PAT hiçbir yerde saklanmaz**; remote URL token'sız: `https://github.com/0xinspectorx0/kpssasistani-mobil.git`
  Push gerekerse PAT geçici eklenir, push sonrası URL hemen token'sız'a çevrilir.

## Son işler (bu oturumda tamamlandı, kullanıcı onayladı)
1. `dd1def0` — Hızlı Erişim 3 kartına sabit eşit yükseklik (`height: 100`, alignItems stretch) — `screens/HomeScreen.tsx`
2. `bedd4a3`, `1a4217e` — alt bar konum ayarları (ara denemeler)
3. `e67e0e5` — **Alt sekme etiketleri**: "Ana Sayfa" 1px sığmadığından `Ana Sa…` kesiliyordu. Çözüm: `tabBarLabel` özel render (fontSize 9.5, adjustsFontSizeToFit, minimumFontScale 0.8), `tabBarAllowFontScaling: false`, bar height 66, paddingTop 2/paddingBottom 8. OCR ile doğrulandı: 6 isim de tam görünüyor. — `App.tsx`
4. `4282d93` — geçici ölçüm scriptleri temizlendi

## Kullanıcı düzeltmeleri / kurallar (BU OTURUMDAN, ihmal edilmesin)
- **Alt sekme etiketleri asla yarım/kesik görünmemeli** — kullanıcı 3 kez bu geri bildirimi verdi; son çözüm onaylandı ("çok iyi oldu").
- Alt bar etiketleri her ekran boyutu/yönünde simgelerin hemen altında ve aynı sabit dikey düzende kalmalı (`tabBarLabelPosition: 'below-icon'`, sabit bar yüksekliği).
- Web arayüzü mobil tema/renkleriyle uyumlu kalmalı; geniş web ekranlarında gerçek site düzeni kullan: masaüstünde sabit sol menü + merkezlenmiş/geniş içerik ve çok sütunlu sayfa düzenleri. Dar ekranda alttaki mobil sekme çubuğu korunur.
- Daha önceki tab bar denemeleri (`0722f93`, `da2375c`) kullanıcı tarafından "daha kötü" bulunup geri alındı; o yaklaşımlara (2 satırlı label, minHeight 58) DÖNÜLMEYECEK. Onaylanan form: tek satır + küçülen font (e67e0e5).
- Hızlı Erişim kartları çerçeveleri eşit/sabit olmalı (içerikle değişmeyecek).
- Admin girişi normal panel üzerinden; roller 3 seviye (Yönetici/Editör/Görüntüleyici); misafir 1, ücretsiz 3, VIP sınırsız test.
- E-posta doğrulama + şifre sıfırlama MUTLAKA kullanıcıya gitmeli ("Confirm email" açık kalacak).
- E-posta: **Brevo SMTP** (kurulum kullanıcıca tamamlandı, mail akışı çalışıyor). Host `smtp-relay.brevo.com:587`, user `bb20ab001@smtp-brevo.com`. Brevo'da "Unauthorized IP..." uyarısının aktivasyonu AÇILMAYACAK.
- "Parolamı unuttum" linki → yeni şifre formu göstermeli, direkt giriş yaptırmayacak (`PasswordRecoveryModal` + `isRecovery`).

## Bekleyenler / bilinmesi gerekenler
- **İçerik aktarımı:** `supabase/icerik-aktar.sql` Supabase Dashboard > SQL Editor'de çalıştırılacak (117 kayıt: 48 soru + dersler/haberler/etkinlikler). Kod tarafında fallback eklendi: sunucu boşsa paketlenmiş veriler siteyi gösterir, site asla boş kalmaz.
- Admin hesabı: `orangeulrica@uberip.com` → Supabase Dashboard > Authentication > Users > "Add user" + `supabase/ilk-admin-kurulumu.sql` çalıştırılacak (kullanıcı henüz doğrulamadı).
- Her yeni oturumda `node_modules` ve `dist` temiz olur: `npm ci` + `npx expo export --clear --platform web` şart.
- Lokal görsel doğrulama kurulabilir: `sudo apt-get update && sudo apt-get install -y libnspr4 libnss3 ...` + `npx playwright install chromium` + `pip install rapidocr-onnxruntime` (oturumlar arası silinebilir).
- Tab bar'ı ölçen script örneği: onboarding'i geç (Başlayalım → Şimdilik geç), alt bar clip screenshot, OCR ile isim kontrolü.

## Kullanıcı profili
- Türkçe iletişim; kısa ve net cevaplar sever; "push et", "PR at" gibi kısa komutlar verir.
- Değişiklikler canlıda (Vercel) görünür; sert yenileme (Ctrl+Shift+R) gerektiğini hatırlat.
