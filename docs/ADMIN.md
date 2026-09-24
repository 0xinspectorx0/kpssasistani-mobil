# KPSS Asistanım — kurulum, hesaplar, roller ve içerik yönetimi

## Ne değişti?

Bu sürümde uygulamaya **hesap sistemi**, **kademeli roller** ve **üyelik planları** eklendi:

| Rol | Yetki | Test kotası |
| --- | --- | --- |
| **Misafir** (giriş yapmamış) | İçerikleri okur | Günde **1** test |
| **Üye** (ücretsiz kayıt) | İçerikleri okur | Günde **3** test |
| **VIP** | İçerikleri okur | Sınırsız |
| **Görüntüleyici** (viewer) | Taslaklar dahil her şeyi görür, değiştiremez | Sınırsız |
| **Editör** (editor) | İçerik ekler/düzenler/siler; rol atayamaz | Sınırsız |
| **Yönetici** (admin) | Her şey + rol atama | Sınırsız |

- **Giriş/kayıt:** Profil → **Hesabım** bölümünden. Üyelik herkese açık olabilir (önerilen) veya kapatılabilir.
- **Yönetim girişi:** Profil → **Yönetici Paneli**. Aynı hesap girişini kullanır; yetkisiz hesap
  "Yönetim yetkiniz yok" ekranını görür.
- **Dersler artık sabit değil:** Panelden yeni ders eklenebilir, ders adı/değişkenleri düzenlenebilir.
- **Toplu soru ekleme:** Panel → Soru Bankası → **Toplu soru ekle** (JSON veya satır bazlı metin/CSV).

## 1. Supabase veritabanı kurulumu

1. Kendi Supabase projenizi oluşturun veya mevcut projenizi seçin.
2. SQL Editor'de **sırasıyla** şu dosyaların tamamını çalıştırın:
   1. `supabase/migrations/202609220001_admin_content.sql`
   2. `supabase/migrations/202609250001_accounts_roles.sql`
3. Tablolar oluşur:
   - `content_entries` (merkezi içerik)
   - `members` (kullanıcı rolleri)
   - `user_activities` (günlük test kotası sayacı)
   - `admin_audit_log` (işlem günlüğü)
4. **Authentication → Providers → Email** açık olsun. Kullanıcıların uygulamadan üye olabilmesi için
   **Authentication → Sign In / Sign Up → "Allow new users to sign up"** seçeneğini açık bırakın
   (üyelik istemiyorsanız kapatabilirsiniz; o zaman yalnızca Supabase'den hesap açarsınız).
   E-posta doğrulaması açıksa yeni üyeler girişten önce e-postalarını doğrulamalıdır.

## 2. İlk yönetici hesabı

Uygulamadan üye olabilirsiniz; ilk **yönetici** yetkisini aşağıdaki gibi verirsiniz.
(Production'da SQL erişimi yalnızca sizde olmalı.)

```sql
-- 'yonetici@ornek.com' ifadesini kendi hesabınızın e-postasıyla değiştirin.
insert into public.members (user_id, role)
select id, 'admin'
from auth.users
where lower(email) = lower('yonetici@ornek.com')
on conflict (user_id) do update set role = 'admin';

-- Bir satır dönmeli; dönmüyorsa önce uygulamadan/supabase'den hesabı oluşturun.
select u.email, m.role
from public.members m
join auth.users u on u.id = m.user_id;
```

> **Migrasyon öncesi adminler:** `202609220001` ile `admin_members` tablosuna kaydedilmiş yöneticiler,
> `202609250001` migrasyonu ile otomatik olarak `members` tablosuna `admin` rolüyle taşınır.

## 3. Uygulamayı bağlama

`.env.example` dosyasını `.env.local` olarak kopyalayın:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://PROJE_KIMLIGI.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=PUBLIC_PUBLISHABLE_VEYA_ANON_KEY
```

Supabase **Project Settings → API / API Keys** bölümündeki **publishable/anon** anahtarı kullanın.
`service_role` asla kullanmayın, `EXPO_PUBLIC_*` değişkenine yazmayın.

```sh
npm ci
npx expo start --clear
```

Değişken değişince Metro'yu yeniden başlatın. Web production: `npx expo export --clear --platform web`.

## 4. İçerikleri yayınlama ve yönetme

1. **Profil → Yönetici Paneli** → giriş yapın.
2. **Genel Bakış → Hazır içerikleri aktar** ile gömülü soruları/içerikleri veritabanına aktarın.
3. **Soru Bankası** bölümünden tek tek soru ekleyin veya **Toplu soru ekle** ile:
   - **JSON** dizisi yapıştırın: `[{ "category":"tarih","difficulty":"Orta","question":"…","options":["A","B","C","D"],"answer":1,"explanation":"…" }]`
   - **Metin/CSV**: her satır `Ders|Zorluk|Soru|A|B|C|D|CevapHarf|Açıklama`
     örn. `tarih|Orta|Malazgirt hangi yılda oldu?|1040|1071|1176|1243|B|1071'de oldu.`
4. **Dersler ve Konular**: yeni ders ekle, ders adını/ders bilgilerini düzenle, konu ekle/kaldır.
   Ders kimliği küçük harf + rakam + tire (`hukuk`, `din-kulturu` gibi). Sorular bu kimlikle derse bağlanır.
5. Taslaklar öğrencilere görünmez; **Yayında** kayıtlar kullanıcıların içerik yenilemesinde görünür.

## 5. Rol yönetimi

- Panel → **Yöneticiler** bölümünde yalnızca **admin** rol atayabilir.
- Rol atamak için hesabın önce var olması gerekir: kullanıcı uygulamadan üye olur veya
  Supabase → Authentication → Users → Add user ile oluşturulur.
- Admin kendi yetkisini düşüremez (kilitlenmeyi önler). Güvenlik için Supabase'de en az bir admin kalmalıdır.

### Rol → erişim özeti

| Yetki | admin | editor | viewer |
| --- | :-: | :-: | :-: |
| İçerik listele (taslak dahil) | ✅ | ✅ | ✅ |
| İçerik ekle / düzenle / sil | ✅ | ✅ | ❌ |
| Toplu soru ekle | ✅ | ✅ | ❌ |
| Rol atama / kaldırma | ✅ | ❌ | ❌ |
| İşlem günlüğü | ✅ | ❌ | ❌ |

## 6. Güvenlik sınırları

- RLS yazmaları sunucuda tekrar kontrol eder; paneli gizlemek tek güvenlik katmanı değildir.
- İstemci, kullanıcının rolünü `user_metadata`'dan okumaz; roller yalnızca `members` tablosundadır.
- `members` tablosuna istemci doğrudan yazamaz; rol RPC'leri sunucuda admin kontrolü yapar.
- Oturum, uygulamada kalıcıdır (AsyncStorage); **Çıkış yap** oturumu sonlandırır. Paylaşılan cihazda çıkış yapın.
- Soru/cevap verileri istemciye gönderilir; bu bir gözetimli sınav sistemi değildir.

## 7. Veri senkronu

- Giriş yapan kullanıcının günlük test kotası Supabase `user_activities` tablosunda tutulur (cihaz bağımsız).
- Misafir kotası yalnızca cihazda tutulur.
- Test geçmişi, favoriler ve konu takibi hâlâ cihazda kalır (ileride merkezi senkron istenirse ayrıca geliştirilir).

## 8. Testler

```sh
npm run typecheck
npm test
npm run build:web
```

`npm test`, PGlite üzerinde iki migration'ın RLS/trigger davranışını birlikte sınar.

Web E2E (bağlı akış):

```sh
EXPO_PUBLIC_SUPABASE_URL=https://kpss-test.supabase.co \
EXPO_PUBLIC_SUPABASE_ANON_KEY=test-public-key \
npx expo export --clear --platform web --output-dir .test-web
python3 -m http.server 8082 --bind 0.0.0.0 --directory .test-web
# ayrı terminal:
E2E_SUPABASE_MOCK=1 E2E_BASE_URL=http://127.0.0.1:8082 npm run test:e2e
```
