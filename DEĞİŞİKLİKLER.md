# KPSS Asistanım — Yapılan Değişiklikler

> Tarih: 2026-09-25 • Kapsam: Hesap sistemi, roller, üyelik kotaları, esnek dersler, toplu soru ekleme

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
  - **Metin/CSV** satır bazlı: `Ders|Zorluk|Soru|A|B|C|D|CevapHarf|Açıklama`
- Kayıtlar tek tek doğrulanır; hatalı satır tüm işlemi iptal eder.

## 5. Veritabanı (yeni migration)

`supabase/migrations/202609250001_accounts_roles.sql` eklendi:
- `members` tablosu (roller: admin/editor/viewer/uye/vip)
- `user_activities` tablosu (günlük test kotası)
- `user_role()`, `set_role()`, `list_members()`, `increment_quiz_count()` RPC'leri
- RLS politikaları rol bazlı okuma/yazmaya güncellendi
- Kayıt olan kullanıcıya otomatik `uye` rolü
- Ders kimliği serbest biçimde doğrulama

## 6. Diğer

- `app.json`: uygulama adı → **KPSS Asistanım**
- `lib/data.ts`: `CategoryId` artık serbest string; bozuk `CATEGORIES` dizisi kaldırıldı
- `docs/ADMIN.md` ve `README.md` yeni akışa göre güncellendi
- Testler güncellendi ve yeni davranışlara göre genişletildi

## Doğrulama durumu

- `npm run typecheck` ✅
- `npm test` (16 test, PGlite üzerinde iki migration'ın RLS/trigger davranışı) ✅
- `npm run build:web` ✅
- E2E preview (4 test) ✅
- E2E bağlı/mock (6 test) ✅

## ⚠️ Yayınlamadan önce Supabase'de yapman gerekenler

1. SQL Editor'de **önce** `supabase/migrations/202609220001_admin_content.sql`,
   **sonra** `supabase/migrations/202609250001_accounts_roles.sql` dosyasını çalıştır.
2. Authentication → Providers → Email açık olsun.
3. Üyelik istiyorsan "Allow new users to sign up" açık kalsın.
4. İlk **admin** yetkisi: `docs/ADMIN.md` bölüm 2'deki SQL ile kendi hesabına ver.
5. `.env.example` → `.env.local` kopyalayıp Supabase URL + anon key gir.
