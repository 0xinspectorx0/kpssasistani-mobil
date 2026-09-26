# KPSS Asistanım — Yapılan Değişiklikler

## 2026-09-26 — Konu bazlı soru yönetimi

- Soru Bankası: ders kartı → konu balonu → konuya ait sorular, arama ve yayın filtresi.
- Balondan soru düzenleme, tekli silme, seçim kutuları ve tüm sayfaları kapsayan toplu silme.
- Silmeden önce konu/adet onayı; kısmi hata halinde tamamlanan adet ve hata bildirimi.
- Konu balonunda doğrudan, ders düzenleyicisinde kaydederek yukarı/aşağı sıralama.
- Konu kimlikleri ve ilerleme korunur; eksik/silinmiş konuya bağlı sorular ayrı listelenir.
- Yeni migration gerekmez; mevcut sürüm kontrolü, RLS ve içerik işlem günlüğü korunur.


> Tarih: 2026-09-25 • Kapsam: Hesap sistemi, roller, üyelik kotaları, esnek dersler, toplu soru ekleme,
> kullanıcı denetimi, 5 seçenekli testler, soru bildirimi ve kullanıcı etkinliği

## 1. Hesap ve üyelik sistemi (yeni)

- **Profil → Hesabım** ekranı eklendi (`components/AuthScreen.tsx`):
  giriş yap + üye ol, plan bilgisi, oturum durumu.
- Oturum artık kalıcıdır (AsyncStorage + Supabase `persistSession`), çıkış ile temizlenir.
- **Üyelik planları ve günlük test kotası** (`lib/membership.ts`):
  - Misafir (giriş yapmamış) → günde **1** test
  - Üye (ücretsiz) → günde **3** test
  - VIP → **sınırsız**
  - Yönetici/Editör/Görüntüleyici → sınırsız
- Kota bitince Quiz ekranı **"Üye Ol / Hesabıma Git"** kapısı gösterir.
  Günün Sorusu (qod) kotaya dahil değildir. Test kur ekranında kalan hak gösterilir.
- Girişli kullanıcının kotası Supabase `user_activities` tablosunda tutulur (cihaz bağımsız);
  misafir kotası cihazda saklanır.

## 2. Kademeli roller (yeni)

| Rol | İçerik görme (taslak dahil) | Ekle/Düzenle/Sil | Rol atama | Günlük görme |
| --- | :-: | :-: | :-: | :-: |
| **admin** | ✅ | ✅ | ✅ | ✅ |
| **editor** | ✅ | ✅ | ❌ | ❌ |
| **viewer** | ✅ (salt okunur) | ❌ | ❌ | ❌ |

- Panel → **Yöneticiler**: rol atama/kaldırma, üye listesi, VIP yapma (yalnızca admin).
- Yetkisiz giriş yapan hesap **"Yönetim yetkiniz yok"** ekranını görür.
- Yönetim girişi artık **normal kullanıcı paneliyle aynı hesaptan** yapılır:
  Profil → Hesabım ile giriş → aynı hesapla Yönetici Paneli.

## 3. Esnek ders/kategori yapısı (yeni)

- Dersler artık kodda **sabit değil**: `lib/lesson-catalog.ts` dersleri yayındaki LESSONS
  kayıtlarından türetir; Ana Sayfa, Test Çöz, Konu Takibi, Profil otomatik güncellenir.
- Panelden **yeni ders eklenebilir** (küçük harf kimlik, örn. `hukuk`), ders adı/ikon/renk
  değiştirilebilir, konu ekle/sil/düzenle yapılabilir.
- Soru, yeni ders kimliğine elle veya listeden seçilerek bağlanabilir.
- Ders silinmeden önce bağlı yayındaki sorular olup olmadığı sunucuda kontrol edilir.

## 4. Toplu soru ekleme (yeni)

- Panel → Soru Bankası → **Toplu soru ekle** (`components/admin/BulkAdd.tsx`):
  - **JSON** dizisi yapıştırma (şema doğrulamalı)
  - **Metin/CSV** satır bazlı: `Ders|Zorluk|Soru|A|B|C|D|E|CevapHarf|Açıklama`
- Kayıtlar tek tek doğrulanır; hatalı satır tüm işlemi iptal eder.

## 5. Veritabanı (yeni migration)

`supabase/migrations/202609250001_accounts_roles.sql` eklendi:
- `members` tablosu (roller: admin/editor/viewer/uye/vip)
- `user_activities` tablosu (günlük test kotası)
- `user_role()`, `set_role()`, `list_members()`, `increment_quiz_count()` RPC'leri
- RLS politikaları rol bazlı okuma/yazmaya güncellendi
- Kayıt olan kullanıcıya otomatik `uye` rolü
- Ders kimliği serbest biçimde doğrulama

## 5a. Kullanıcı denetimi — engelleme ve hesap silme (yeni)

`supabase/migrations/202609250002_user_moderation.sql` eklendi:
- `members.banned` + `members.banned_at` kolonları
- `user_role()` engelli kullanıcı için `banned` döner; `is_admin` / `can_manage_content` /
  `is_member` engellileri dışlar (sunucu tarafında erişim kesilir)
- `set_banned(target_email, state)` — admin engeller/engeli kaldırır; son admin engellenemez
- `list_members()` artık `banned` durumunu da döndürür
- `resolve_user_id(target_email)` — admin kontrollü e-posta → kullanıcı kimliği (silme için)

Panel → **Yöneticiler** kartında her kullanıcıya **Engelle / Engeli kaldır** ve **Hesabı sil** butonları eklendi.
Engellenen kullanıcının açık oturumu sonlandırılır; işlem `BAN_USER` / `UNBAN_USER` olarak günlüğe yazılır.

**Hesap silme** Supabase Auth kullanıcısını da silmek için **service role** gerektirir →
`supabase/functions/delete-user` Edge Function eklendi. Kurulum adımları `docs/ADMIN.md` → bölüm 5a'da.

## 5b. 5 seçenekli testler (A–E)

- **Sorular artık 5 seçeneklidir (A, B, C, D, E).** 48 hazır sorunun tamamına 5. seçenek eklendi.
- Şema, veritabanı tetikleyicisi (`validate_content_entry`) ve toplu ekleme formatı 5 seçenek zorunluluğuna güncellendi.
- Toplu ekleme Metin/CSV biçimi: `Ders|Zorluk|Soru|A|B|C|D|E|Cevap|Açıklama`.

## 5c. Soru düzenleme, hatalı soru bildirimi ve kullanıcı etkinliği

- **Admin için soru üzerinde düzenle:** Test çözerken sorunun üzerinde **Düzenle** simgesi belirir;
  tıklayınca yüzen bir pencerede (ContentEditor) soru yerinde düzenlenir ve kaydedilir.
- **Hatalı soru bildirimi:** Tüm kullanıcılar sorunun üzerindeki **Bildir** simgesiyle hatalı soruyu işaretler.
  Bildirimler Supabase'e kaydedilir; admin panelde **Soru Bildirimleri** bölümünde görür, çözer veya kapatır.
- **Kullanıcı etkinliği:** Panel → **Genel Bakış** üstünde toplam üye, bugün aktif, son 7 gün aktif
  ve toplam çözülen test sayılarını gösteren kartlar eklendi.
- Ilgili migration: `supabase/migrations/202609250003_question_reports.sql`
  (`question_reports` tablosu, `list_reports()`, `set_report_status()`, `get_user_stats()`).

## 5d. Hesap yönetimi: Edge Function'sız hesap silme, e-postaya önceden rol, panelden hesap açma (2026-09-26)

- **Hesap silme artık ek kurulum istemez.** `delete_user_account(target_email)` SECURITY DEFINER SQL fonksiyonu
  `auth.users` kaydını doğrudan siler (Supabase'in önerdiği yöntem); CLI / Docker / `service_role` /
  Edge Function gerekmez. Panel önce bu RPC'yi dener; yoksa eski `delete-user` Edge Function'a düşer,
  o da yoksa hangi SQL dosyasının çalıştırılacağını söyler. Kendi hesabı ve admin hesapları silinemez.
- **E-postaya önceden rol atama:** `assign_role(target_email, new_role)` — hesap kayıtlıysa hemen uygular,
  değilse `pending_roles` tablosuna yazar; kişi üye olur olmaz `on_auth_user_created` tetikleyicisi rolü
  otomatik uygular. Panelde **Bekleyen rol atamaları** listesi ve **Kaldır** butonu (`list_pending_roles`,
  `cancel_pending_role`).
- **Panelden yeni hesap oluşturma:** e-posta + geçici şifre + rol. Yöneticinin oturumunu bozmayan ayrı bir
  istemciyle `signUp` yapılır; doğrulama e-postası kişiye gider, rol otomatik uygulanır.
- İşlem günlüğü etiketleri: `DELETE_USER`, `PENDING_ROLE:<rol>`, `APPLY_PENDING_ROLE:<rol>`, `CANCEL_PENDING_ROLE`.
- Migration: `supabase/migrations/202609260002_account_admin.sql` (tek dosya kurulum da güncellendi).
- Testler: PGlite'ta bekleyen rol akışı ve Edge Function'sız silme (2 yeni test, toplam 29).

## 6. Diğer

- `app.json`: uygulama adı → **KPSS Asistanım**
- `lib/data.ts`: `CategoryId` artık serbest string; bozuk `CATEGORIES` dizisi kaldırıldı
- `docs/ADMIN.md` ve `README.md` yeni akışa göre güncellendi
- Testler güncellendi ve yeni davranışlara göre genişletildi

## Doğrulama durumu

- `npm run typecheck` ✅
- `npm test` (18 test, PGlite üzerinde üç migration'ın RLS/trigger davranışı) ✅
- `npm run build:web` ✅
- E2E preview (4 test) ✅
- E2E bağlı/mock (6 test) ✅

## ⚠️ Yayınlamadan önce Supabase'de yapman gerekenler

1. SQL Editor'de **sırasıyla** `supabase/migrations/202609220001_admin_content.sql`,
   `supabase/migrations/202609250001_accounts_roles.sql`,
   `supabase/migrations/202609250002_user_moderation.sql`,
   `supabase/migrations/202609250003_question_reports.sql`,
   `supabase/migrations/202609260001_quiz_quotas.sql`,
   `supabase/migrations/202609260002_account_admin.sql` dosyalarını çalıştır
   (veya hepsi birden: `supabase/tek-seferde-kurulum.sql`).
2. Authentication → Providers → Email açık olsun.
3. Üyelik istiyorsan "Allow new users to sign up" açık kalsın.
4. İlk **admin** yetkisi: `docs/ADMIN.md` bölüm 2'deki SQL ile kendi hesabına ver.
5. `.env.example` → `.env.local` kopyalayıp Supabase URL + anon key gir.
6. **Hesap silme** için ek kurulum gerekmez (6. migration yeterli). Edge Function isteğe bağlı eski yoldur
   (`docs/ADMIN.md` → bölüm 5a).
