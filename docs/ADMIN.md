# KPSS Asistanım — kurulum, hesaplar, roller ve içerik yönetimi

> 📱 Android yayınlama için → [`ANDROID-YAYINLAMA.md`](./ANDROID-YAYINLAMA.md)
> 🌐 Web yayınlama için → [`WEB-YAYINLAMA.md`](./WEB-YAYINLAMA.md)

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
- **Yönetim girişi:** Profil → Hesabım ile admin hesabıyla giriş yapın. **Yönetici Paneli** yalnızca
  admin hesaplarında Profil sayfasının en üstünde görünür. Yetkisiz hesap "Yönetim yetkiniz yok" ekranını görür.
- **Dersler artık sabit değil:** Panelden yeni ders eklenebilir, ders adı/değişkenleri düzenlenebilir.
- **Toplu soru ekleme:** Panel → Soru Bankası → **Toplu soru ekle** (JSON veya satır bazlı metin/CSV).

## 1. Supabase veritabanı kurulumu

1. Kendi Supabase projenizi oluşturun veya mevcut projenizi seçin.
2. SQL Editor'de **sırasıyla** şu dosyaların tamamını çalıştırın:
   1. `supabase/migrations/202609220001_admin_content.sql`
   2. `supabase/migrations/202609250001_accounts_roles.sql`
   3. `supabase/migrations/202609250002_user_moderation.sql` (engelleme/silme desteği)
   4. `supabase/migrations/202609250003_question_reports.sql` (soru bildirimi + kullanıcı istatistikleri)
   5. `supabase/migrations/202609260001_quiz_quotas.sql` (yönetim panelinden günlük plan kotalarını düzenleme)
   6. `supabase/migrations/202609260002_account_admin.sql` (**Edge Function'sız hesap silme** + e-postaya
      önceden rol atama + panelden hesap oluşturma)

   > Kısayol: `supabase/tek-seferde-kurulum.sql` altı dosyanın sırayla birleştirilmiş hâlidir; yeni projede
   > tek seferde çalıştırılabilir. Mevcut projede yalnızca eksik olan (ör. 6.) dosyayı çalıştırmanız yeterlidir.
3. Tablolar oluşur:
   - `content_entries` (merkezi içerik)
   - `members` (kullanıcı rolleri + `banned` durumu)
   - `pending_roles` (henüz üye olmamış e-postalara önceden atanan roller)
   - `user_activities` (günlük test kotası sayacı)
   - `question_reports` (hatalı soru bildirimleri)
   - `quiz_quota_settings` (Misafir/Üye/VIP günlük test hakları)
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

1. **Profil → Hesabım** ile admin hesabına giriş yapın, ardından sayfanın en üstündeki **Yönetici Paneli**ne girin.
2. **Genel Bakış → Hazır içerikleri aktar** ile gömülü soruları/içerikleri veritabanına aktarın.
3. **Soru Bankası** bölümünden tek tek soru ekleyin veya **Toplu soru ekle** ile:
   - **JSON** dizisi yapıştırın: `[{ "category":"tarih","difficulty":"Orta","question":"…","options":["A","B","C","D","E"],"answer":1,"explanation":"…" }]`
   - **Metin/CSV**: her satır `Ders|Zorluk|Soru|A|B|C|D|E|CevapHarf|Açıklama` — sorular 5 seçeneklidir (A–E).

     örn. `tarih|Orta|Malazgirt hangi yılda oldu?|1040|1071|1176|1243|1141|B|1071'de oldu.`
4. **Dersler ve Konular**: yeni ders ekle, ders adını/ders bilgilerini düzenle, konu ekle/kaldır.
   Ders kimliği küçük harf + rakam + tire (`hukuk`, `din-kulturu` gibi). Sorular bu kimlikle derse bağlanır.
5. Taslaklar öğrencilere görünmez; **Yayında** kayıtlar kullanıcıların içerik yenilemesinde görünür.

## 5. Rol yönetimi

- Panel → **Yöneticiler** bölümünde yalnızca **admin** rol atayabilir.
- **Hesabın önceden var olması gerekmez.** E-postayı yazıp rolü seçin (`assign_role` RPC'si):
  - hesap kayıtlıysa rol **hemen** uygulanır;
  - hesap yoksa rol **Bekleyen rol atamaları** listesine yazılır; kişi aynı e-postayla üye olur olmaz
    `on_auth_user_created` tetikleyicisi rolü otomatik uygular (işlem günlüğünde `APPLY_PENDING_ROLE`).
    Bekleyen kayıt panelden **Kaldır** ile iptal edilebilir.
- **Yeni hesap oluştur** kartı: e-posta + geçici şifre + rol girin. Hesap, yöneticinin oturumunu bozmayan
  ayrı bir istemciyle `signUp` üzerinden açılır; kişiye doğrulama e-postası gider ve seçilen rol otomatik
  uygulanır. Geçici şifreyi kişiye iletin; ilk girişten sonra **Hesabım** bölümünden değiştirebilir
  (veya "Parolamı unuttum" ile kendisi belirler). Bunun için Supabase'de
  **Authentication → Sign In / Sign Up → "Allow new users to sign up"** açık olmalıdır.
- Alternatif: Supabase → Authentication → Users → **Invite user** ile davet gönderip panelde e-postaya
  rolü önceden atayabilirsiniz; davet kabul edilince rol uygulanır.
- Admin kendi yetkisini düşüremez (kilitlenmeyi önler). Güvenlik için Supabase'de en az bir admin kalmalıdır.

## 5a. Kullanıcı denetimi: engelleme ve hesap silme

- Aynı **Yöneticiler** bölümünde her kullanıcı kartında **Engelle / Engeli kaldır** ve **Hesabı sil** butonları vardır.
- **Engelle:** `members.banned = true` yapar. Engelli kullanıcının tüm yetkileri sunucu tarafında düşer
  (`user_role()` `banned` döner, `is_admin`/`can_manage_content`/`is_member` engelliyi dışlar); açık oturumları
  sona erer. İşlem `BAN_USER` olarak işlem günlüğüne yazılır. **Engeli kaldır** geri alır (`UNBAN_USER`).
- Son yönetici engellenemez (kilitlenme koruması).
- **Hesabı sil:** kullanıcıyı hem `auth.users` hem de `members` / `user_activities` kaydından kalıcı olarak siler.
  **Geri alınamaz.** Admin hesapları ve kendi hesabınız silinemez; önce yetkisini kaldırın.

### Hesap silme nasıl çalışır? (ek kurulum gerekmez)

`202609260002_account_admin.sql` ile gelen `delete_user_account(target_email)` fonksiyonu **SECURITY DEFINER**
olduğundan fonksiyonun sahibi (`postgres`) adına çalışır ve `auth.users` kaydını doğrudan siler; Supabase'in
kendi FK'ları (identities, sessions, refresh_tokens, mfa) ile bu projedeki `members` / `user_activities`
kayıtları birlikte silinir. Çağıranın **admin** olduğu sunucuda doğrulanır; anon anahtarın bilinmesi tek
başına silme yetkisi vermez. CLI, Docker, `service_role` anahtarı veya Edge Function **gerekmez** —
yalnızca migration dosyasının SQL Editor'de bir kez çalıştırılmış olması yeterlidir.

> Silinen kullanıcının açık oturumu (JWT) süresi dolana kadar teknik olarak geçerli kalabilir; `members`
> kaydı silindiği için tüm yetkileri anında düşer (`is_member()` false döner).

> Panelde "Veritabanı kurulumu eksik: … 202609260002_account_admin.sql …" uyarısı görürseniz bu dosyayı
> henüz çalıştırmamışsınız demektir.

<details>
<summary>Eski yol (isteğe bağlı): <code>supabase/functions/delete-user</code> Edge Function</summary>

Uygulama önce SQL fonksiyonunu dener; yoksa bu Edge Function'a düşer. Yeni kurulumlarda gerekmez.

```sh
supabase login
supabase link --project-ref PROJE_KIMLIGI
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sb_secret_...  # asla istemciye/EXPO_PUBLIC_*'a yazma
supabase functions deploy delete-user --no-verify-jwt
```

</details>

### 5b. Soru bildirimleri ve kullanıcı etkinliği

- Öğrenciler (misafir dahil) test çözerken sorunun üstündeki **Bildir** simgesiyle hatalı soruyu işaretler.
- Bildirimler panel → **Soru Bildirimleri** bölümünde listelenir (yalnızca admin). Bildirim;
  soru kimliği, gönderen e-posta, açıklama ve durum (YENİ / ÇÖZÜLDÜ / KAPATILDI) içerir.
- **Çözüldü / Kapat** butonları durumu günceller; **Soruyu düzenle** doğrudan ilgili sorunun editörünü açar.
- Panel → **Genel Bakış** üstünde **Kullanıcı etkinliği** kartları: toplam üye, bugün aktif,
  son 7 gün aktif ve toplam çözülen test sayısı (`get_user_stats` RPC'si ile).
- Bu özellikler `202609250003_question_reports.sql` migration'ı ile gelir (yukarıda kurulum adımlarına eklendi).

### Günlük test kotaları

- Yönetim panelindeki **Test Kotaları** bölümünden Misafir, Üye ve VIP günlük test hakları değiştirilebilir; her değer 0–9999 arasıdır. VIP ayrıca sınırsız yapılabilir.
- Ayarlar Supabase'de saklanır, tüm istemciler tarafından okunur ve kod değişikliği/deploy gerektirmeden uygulanır. Varsayılanlar: Misafir 1, Üye 3, VIP sınırsız.
- Güvenlik için ayarları yalnızca `admin` rolü güncelleyebilir; değişiklikler işlem günlüğüne yazılır.
- Özellik `202609260001_quiz_quotas.sql` migration'ı ile gelir.

### Rol → erişim özeti

| Yetki | admin | editor | viewer |
| --- | :-: | :-: | :-: |
| İçerik listele (taslak dahil) | ✅ | ✅ | ✅ |
| İçerik ekle / düzenle / sil | ✅ | ✅ | ❌ |
| Toplu soru ekle | ✅ | ✅ | ❌ |
| Rol atama / kaldırma (bekleyen roller dahil) | ✅ | ❌ | ❌ |
| Hesap oluşturma / engelleme / silme | ✅ | ❌ | ❌ |
| İşlem günlüğü | ✅ | ❌ | ❌ |

## 6. Güvenlik sınırları

- RLS yazmaları sunucuda tekrar kontrol eder; paneli gizlemek tek güvenlik katmanı değildir.
- İstemci, kullanıcının rolünü `user_metadata`'dan okumaz; roller yalnızca `members` tablosundadır.
- `members` tablosuna istemci doğrudan yazamaz; rol RPC'leri sunucuda admin kontrolü yapar.
- Oturum, uygulamada kalıcıdır (AsyncStorage); **Çıkış yap** oturumu sonlandırır. Paylaşılan cihazda çıkış yapın.
- Soru/cevap verileri istemciye gönderilir; bu bir gözetimli sınav sistemi değildir.

## 7. Veri senkronu

- Giriş yapan kullanıcının günlük test sayacı Supabase `user_activities` tablosunda tutulur (cihaz bağımsız); misafir sayacı cihazda kalır.
- Plan limitleri Supabase `quiz_quota_settings` tablosunda saklanır ve tüm istemcilerce okunur; istemcide kısa süreli çevrimdışı yedek kopya bulunur.
- Test geçmişi, favoriler ve konu takibi hâlâ cihazda kalır (ileride merkezi senkron istenirse ayrıca geliştirilir).

## 8. Testler

```sh
npm run typecheck
npm test
npm run build:web
```

`npm test`, PGlite üzerinde migration'ların RLS/trigger davranışını birlikte sınar (kota ayarları, bekleyen
roller ve Edge Function'sız hesap silme dahil).

Web E2E (bağlı akış):

```sh
EXPO_PUBLIC_SUPABASE_URL=https://kpss-test.supabase.co \
EXPO_PUBLIC_SUPABASE_ANON_KEY=test-public-key \
npx expo export --clear --platform web --output-dir .test-web
python3 -m http.server 8082 --bind 0.0.0.0 --directory .test-web
# ayrı terminal:
E2E_SUPABASE_MOCK=1 E2E_BASE_URL=http://127.0.0.1:8082 npm run test:e2e
```
