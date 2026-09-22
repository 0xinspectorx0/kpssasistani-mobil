# Yönetici paneli — kurulum ve kullanım

## Soruları nereden ekleyeceğim?

**Profil → Ayarlar → Yönetici Paneli → Soru Bankası → Yeni soru**

Ders, zorluk, soru metni, 4 veya 5 seçenek, doğru cevap ve çözüm açıklamasını girin.
Doğru seçeneğin harfine dokunun. **Taslak olarak kaydet** yalnızca yöneticilere görünür;
**Yayında → Kaydet ve yayınla** öğrenci test havuzuna ekler. Düzenleme, arama, ders/yayın
filtresi, sayfalama, önizleme ve onaylı silme desteklenir.

Panelde ayrıca şu içerikler yönetilir:
- Dersler ve konular (KPSS'nin altı sabit ders kimliği altında)
- Güncel bilgi kartları
- Sınav takvimi ve hedef sınavlar
- Taban puanlar
- Motivasyon sözleri
- Yönetici yetkileri ve son 50 işlem kaydı

**Bu değişiklikle bulut projesi oluşturulmuş veya canlıya dağıtılmış değildir.**
Aşağıdaki bağlantı kurulmadan normal uygulama mevcut gömülü içerikle çalışır;
panelde yalnızca açıkça işaretlenmiş **salt okunur önizleme** açılabilir. Örnek admin
şifresi, arka kapı veya cihazda saklanan admin rolü bulunmaz.

## 1. Supabase veritabanı

1. Kendi Supabase projenizi oluşturun veya mevcut projenizi seçin.
2. SQL Editor'de `supabase/migrations/202609220001_admin_content.sql` dosyasının
   tamamını **bir kez** çalıştırın. Supabase CLI kullanıyorsanız migration'ı `supabase db push`
   ile uygulayabilirsiniz. Var olan üretim veritabanında önce yedek/staging testi yapın.
3. Şu tablolar oluşur: `content_entries`, `admin_members`, `admin_audit_log`.
4. Authentication altında e-posta/şifre sağlayıcısının açık olduğundan emin olun.
   Bu uygulama herkese açık hesap kaydı sunmaz; yalnızca admin hesabı için kullanılacak
   projede public sign-up'ı kapatmanız önerilir. Auth rate limitlerini etkin tutun.

## 2. İlk yönetici hesabı

1. Supabase **Authentication → Users → Add user** bölümünde kendi e-posta adresinizle
   güçlü, benzersiz şifreli bir kullanıcı oluşturun; e-postayı doğrulayın/auto-confirm seçin.
2. SQL Editor'de aşağıdaki örnek e-postayı **kendi hesabınızın e-postasıyla** değiştirip çalıştırın:

```sql
insert into public.admin_members (user_id)
select id
from auth.users
where lower(email) = lower('yonetici@ornek.com')
  and email_confirmed_at is not null
on conflict (user_id) do nothing;

-- Bir satır dönmeli; dönmüyorsa e-posta ve doğrulamayı kontrol edin.
select u.email, m.created_at
from public.admin_members m
join auth.users u on u.id = m.user_id;
```

Bu ilk yetkilendirme yalnızca proje sahibinin güvenilir SQL ortamından yapılır.
Şifrenizi, service-role/secret anahtarınızı veya veritabanı parolanızı koda/sohbete koymayın.

## 3. Uygulamayı bağlama

`.env.example` dosyasını `.env.local` olarak kopyalayın:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://PROJE_KIMLIGI.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=PUBLIC_PUBLISHABLE_VEYA_ANON_KEY
```

Bu değerler Supabase **Project Settings → API / API Keys** altında bulunur.
Yalnızca **publishable** veya eski **anon** anahtarını kullanın. `service_role`, `sb_secret_…`
ve veritabanı parolası **asla** `EXPO_PUBLIC_*` değişkenlerine yazılmamalıdır.
Public anahtar uygulama paketinde görünür; güvenliği sağlayan sunucu tarafındaki RLS'dir.

```sh
npm ci
npx expo start --clear
```

Değişkenleri değiştirdiğinizde Metro'yu yeniden başlatıp önbelleği temizleyin.
Web üretim derlemesi: `npx expo export --clear --platform web`.
Vercel/EAS kullanıyorsanız aynı iki değişkeni ilgili build ortamına ekleyip yeniden derleyin.
Vercel yapılandırması artık `npm run build:web` ile `dist/` çıktısını üretir.

## 4. İlk içerikleri yayınlama

1. Uygulamada **Profil → Yönetici Paneli** üzerinden giriş yapın.
2. **Genel Bakış → Hazır içerikleri aktar** düğmesine basıp onaylayın.
3. Mevcut 117 içerik (48 soru dahil) veritabanına **yayında** olarak aktarılır.
4. Aynı kimlikli mevcut içerikler değiştirilmez. Tekrar aktarım, daha önce sildiğiniz
   gömülü içerikleri yeniden ekler; tamamen özel içerikle devam edecekseniz tekrar aktarmayın.
5. Artık soru ve diğer içerikleri panelden yönetin; `lib/data.ts` düzenlemek gerekmez.

Bağlı fakat boş veritabanı **bilerek boş gösterilir**. Son soruyu silmek veya taslağa
almak, hazır soruları otomatik olarak geri getirmez. İlk yayından önce hazır içerikleri
aktarmayı unutmayın.

## 5. Yayınlama, çevrimdışı kullanım ve veri bütünlüğü

- Öğrenci ekranları yalnızca `published` kayıtları okur; admin giriş yapmış olsa bile taslakları göstermez.
- İçerik açılışta, uygulama tekrar aktif olduğunda, aktif kullanımda yaklaşık 60 saniyede bir
  ve ana sayfada aşağı çekerek yenilenir. Başarısız bağlantıda bir yeniden dene düğmesi de gösterilir.
- Yalnızca yayınlanmış içerik cihazda önbelleğe alınır. Çevrimdışı cihaz, son indirdiği içeriği
  görmeye devam eder; kaldırılan bir yayının cihazdan silinmesi bağlantı/yenileme gerektirir.
- Devam eden test kendi soru kopyasını kullanır; arka plan güncellemesi test cevaplarını bozmaz.
- Soru/konu düzenlemek kimlikleri korur. Silip tekrar eklemek yeni kimlik oluşturur; eski favori
  ve konu ilerlemesi yeni kayıtla eşleşmez. Silinen konular ilerleme yüzdesini şişirmez.
- Aynı kaydı iki yönetici düzenlerse `updated_at` kontrolü eski formun yeni kaydı ezmesini engeller;
  hata halinde listeyi yenileyip formu yeniden açın.
- Yayındaki hedef sınav için yayındaki bir takvim etkinliğini seçin. Panel, bağlı etkinliği silmeden
  veya taslağa almadan önce hedef bağlantısını güncellemenizi ister.

## 6. Yönetici ekleme, yetki kaldırma ve şifre

- Yeni kişinin Auth hesabını önce Supabase Authentication bölümünde oluşturup doğrulayın.
- Panelde **Yöneticiler** bölümüne e-postasını yazıp **Yönetici yetkisi ver** işlemini onaylayın.
- Tüm yöneticiler aynı yetkiye sahiptir; içerikleri ve diğer yöneticilerin yetkilerini yönetebilir.
- Bir yönetici kendi yetkisini panelden kaldıramaz. Hesap oluşturma/silme, şifre kurtarma
  ve ilk admin kurtarma işlemleri Supabase proje sahibinde kalır.
- Yetki kaldırıldığı anda sonraki veritabanı yazmaları RLS tarafından reddedilir.
  Açık panel en geç sonraki periyodik rol kontrolünde kapanır.
- Oturum token'ı yalnızca bellektedir; AsyncStorage'a veya kalıcı tarayıcı depolamasına yazılmaz.
  Uygulama süreci kapanınca veya web sayfası yenilenince tekrar giriş gerekir. Arka plana
  almak tek başına çıkış değildir; paylaşılan cihazda **Çıkış yap** düğmesini kullanın.

## Güvenlik sınırları

- Anonim/normal kullanıcılar yalnızca yayındaki içeriği okuyabilir; rol atayamaz veya içerik yazamaz.
- Rol, kullanıcı tarafından düzenlenebilen `user_metadata` alanından okunmaz. `admin_members`
  tablosu doğrudan istemci yazmasına kapalıdır; yetki RPC'leri sunucuda admin kontrolü yapar.
- RLS, içerik yazmalarında yetkiyi yeniden kontrol eder. Paneli gizlemek tek güvenlik katmanı değildir.
- Soru için kritik alanlar veritabanı trigger'ında da doğrulanır; tüm form/veri türleri istemci
  şemasıyla kontrol edilir. Doğrudan SQL düzenlemelerinde veri şemasını koruyun.
- İşlem günlüğü sunucu trigger/RPC'siyle oluşturulur; istemciler değiştiremez. SQL Editor'den
  manuel bootstrap/rol müdahaleleri bu uygulama günlüğünün dışında kalır.
- Bu bir çalışma/test uygulamasıdır; yayınlanmış soruların cevapları da istemciye gönderilir.
  Gözetimli sınav/cevap gizleme sistemi değildir.

## Kapsam dışında kalanlar

Öğrenci adı, favorileri, konu ilerlemesi ve test geçmişi mevcut tasarımdaki gibi **cihazda**
kalır. Merkezi öğrenci listesi, öğrenci hesabı silme/engelleme, toplu öğrenci istatistikleri,
push bildirimi, ödeme, uygulama kodu/puan hesaplama formülü düzenleme bu panelde yoktur.
Bunlar öğrenci kimlik doğrulaması, ayrı veri tabloları ve ilgili servislerle ayrıca geliştirilmelidir.

## Testler

```sh
npm run typecheck
npm test
npm run build:web
```

`npm test`, veri şemalarını ve migration'ın gerçek PostgreSQL RLS/trigger davranışını PGlite
üzerinde sınar. Auth şeması test fixture'ıdır; gerçek GoTrue servisi değildir.

Web E2E testleri için:

```sh
npx playwright install chromium
# Supabase değişkenleri olmadan önizleme derlemesi:
npx expo export --clear --platform web
python3 -m http.server 8081 --bind 0.0.0.0 --directory dist
# Ayrı terminal:
npm run test:e2e
```

Bağlı admin akışı HTTP mock'larıyla ayrıca test edilir:

```sh
EXPO_PUBLIC_SUPABASE_URL=https://kpss-test.supabase.co \
EXPO_PUBLIC_SUPABASE_ANON_KEY=test-public-key \
npx expo export --clear --platform web --output-dir .test-web
python3 -m http.server 8082 --bind 0.0.0.0 --directory .test-web
# Ayrı terminal:
E2E_SUPABASE_MOCK=1 E2E_BASE_URL=http://127.0.0.1:8082 npm run test:e2e
```

Mock anahtarlar yalnızca test derlemesi içindir; `.test-web` üretime dağıtılmaz.
Gerçek Supabase bağlantısıyla, iki ayrı hesapla (admin/yetkisiz kullanıcı) staging testi yapın.
Android/iOS cihaz testleri ayrıca yapılmalıdır. Mevcut repoda `assets/favicon.png` bulunmadığı
web export sırasında uyarı verir; bu admin özelliğinden bağımsız mevcut bir varlık eksikliğidir.
