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
- **Günün sözü balonu masaüstü web'de sol menüde, Profil'in hemen altında** (menü öğeleriyle aynı 27px/306px ritmi, 24px boşluk). Pencere kısaldığında ya da mobilde balon otomatik olarak ana sayfa gövdesine döner (`components/QuoteOfTheDay.tsx`, konumu `SIDEBAR_QUOTE_TOP` sabiti belirler; yan menü gerçek genişliği 360px — kütüphane `minWidth` değeri).
- Test akışında üstteki çıkış butonu web ve native'de çalışan onay modalı göstermeli; test kurulumunda tüm konular veya tek/çoklu konu seçimi sunulmalı; çoklu konu testinde sorular konulara dengeli dağıtılmalı ve havuz yetersizse seçilen sayı tamamlanana kadar her konu havuzu kendi içinde yeniden karıştırılarak soru tekrarına izin verilmeli; soru sayısı seçenekleri 5, 10, 20 ve manuel giriş olarak dört kutuda yan yana gösterilmeli. Ana sayfadaki ders kartı doğrudan testi başlatmaz; konu seçme penceresini açar. Günün Sorusu da modal içinde çözülebilir.
- Admin girişi normal panel üzerinden; roller 3 seviye (Yönetici/Editör/Görüntüleyici); kota varsayılanı misafir 1, ücretsiz 3, VIP sınırsız. Admin panelindeki Test Kotaları bölümünden Misafir/Üye/VIP limitleri değiştirilebilir, VIP sınırsız seçeneği korunur.
- E-posta doğrulama + şifre sıfırlama MUTLAKA kullanıcıya gitmeli ("Confirm email" açık kalacak).
- E-posta: **Brevo SMTP** (kurulum kullanıcıca tamamlandı, mail akışı çalışıyor). Host `smtp-relay.brevo.com:587`, user `bb20ab001@smtp-brevo.com`. Brevo'da "Unauthorized IP..." uyarısının aktivasyonu AÇILMAYACAK.
- "Parolamı unuttum" linki → yeni şifre formu göstermeli, direkt giriş yaptırmayacak (`PasswordRecoveryModal` + `isRecovery`).

## Bekleyenler / bilinmesi gerekenler
- **Canlıya alınacak commit (oturum 01a0dee6, 2. tur):** "feat: Edge Function'sız hesap silme, e-postaya önceden rol
  atama, panelden hesap oluşturma". Bu oturum kapalı olduğu için push edilemedi. Temiz patch: `hesap-yonetimi.patch`
  (`git format-patch` çıktısı; `main` = b12c908 üzerine `git am hesap-yonetimi.patch` ile uygulanır). Oturumun
  kümülatif patch artefaktı ayrıca PR #5 (QuizSheet) içeriğini de taşır — o kısım main'de zaten var, atlanmalı.
- **Hesap yönetimi migration'ı:** `supabase/migrations/202609260002_account_admin.sql` Supabase Dashboard > SQL Editor'de
  çalıştırılacak (Edge Function'sız hesap silme `delete_user_account`, bekleyen roller `pending_roles`/`assign_role`,
  panelden hesap oluşturma). Çalıştırılmadan panelde "Hesabı sil" → "Veritabanı kurulumu eksik: …" uyarısı verir.
  `delete-user` Edge Function artık gerekmez (isteğe bağlı eski yol).
- **İçerik aktarımı:** `supabase/icerik-aktar.sql` Supabase Dashboard > SQL Editor'de çalıştırılacak (117 kayıt: 48 soru + dersler/haberler/etkinlikler). Kod tarafında fallback eklendi: sunucu boşsa paketlenmiş veriler siteyi gösterir, site asla boş kalmaz.
- Admin hesabı: `orangeulrica@uberip.com` → Supabase Dashboard > Authentication > Users > "Add user" + `supabase/ilk-admin-kurulumu.sql` çalıştırılacak (kullanıcı henüz doğrulamadı).
- Her yeni oturumda `node_modules` ve `dist` temiz olur: `npm ci` + `npx expo export --clear --platform web` şart.
- Lokal görsel doğrulama kurulabilir: `sudo apt-get update && sudo apt-get install -y libnspr4 libnss3 ...` + `npx playwright install chromium` + `pip install rapidocr-onnxruntime` (oturumlar arası silinebilir).
- Tab bar'ı ölçen script örneği: onboarding'i geç (Başlayalım → Şimdilik geç), alt bar clip screenshot, OCR ile isim kontrolü.

## Kullanıcı profili
- Türkçe iletişim; kısa ve net cevaplar sever; "push et", "PR at" gibi kısa komutlar verir.
- Değişiklikler canlıda (Vercel) görünür; sert yenileme (Ctrl+Shift+R) gerektiğini hatırlat.


## Yerel çalışma — 2026-09-26: konu bazlı soru yönetimi

- Soru Bankası'nda ders → konu balonu → sorular; düzenleme, tekli/toplu silme, konu içi arama/yayın filtresi.
- Toplu seçim tüm sayfaları kapsar; konu/filtre değişince temizlenir. Silme her satır için
  mevcut `deleteEntry` RLS + `updated_at` kontrolünü kullanır; ilk hatada durup kısmi sonucu bildirir.
- Konu sırası balondan hemen veya ders düzenleyicisinden form kaydıyla değiştirilir.
  `payload.topics` dizisi kullanılır; kimlik/ilerleme korunur. Ek migration yok.
- Yeni dosyalar: `components/admin/QuestionManager.tsx`, `lib/admin-questions.ts`,
  `tests/admin-questions.test.ts`. UI senaryoları mevcut Playwright testlerine eklendi.
- Doğrulama: typecheck, 39/39 birim/PostgreSQL testi, web build başarılı.
  Playwright test listeleri yükleniyor; Chromium indirmesi ve sistem tarayıcısı kurulumu
  ağ/TLS erişim hatası nedeniyle başarısız. Masaüstü/mobil tarayıcı testleri henüz çalıştırılmadı.
- Bu değişiklikler yalnızca yerelde: önceki PR birleştiği için mevcut kodlama oturumu kapalı.
  Yeni oturumda değişiklikleri taşıyıp tarayıcı testleri, PR ve production deploy tamamlanmalı.
