# 🌐 KPSS Asistanım — Web'de Yayınlama Rehberi

> Hedef: uygulamayı herkesin tarayıcıdan (bilgisayar, tablet, telefon) açabildiği bir web sitesi olarak yayınlamak.
> Bu proje Expo (React Native) ama `web` platformu tam destekli; aynı kod tabanı tarayıcıda çalışır.

---

## Nasıl çalışır? (kısaca)

`npx expo export --platform web` komutu, uygulamanın statik bir web sürümünü `dist/` klasörüne üretir.
Bu klasörü herhangi bir statik hosting'e yüklersiniz — sunucu, gerçek Supabase API'leri üzerinden veri alır.

`package.json` içinde hazır script mevcut:

```json
"build:web": "expo export --platform web"
```

Projede **Vercel** için hazır `vercel.json` var:

```json
{
  "buildCommand": "npm run build:web",
  "outputDirectory": "dist",
  "rewrites": [...]  // SPA: tüm yolları index.html'e yönlendirir
}
```

---

## Ön hazırlık

### 1. Supabase anahtarlarını tanımlayın
Web derlemesinde `EXPO_PUBLIC_*` değişkenleri uygulamaya gömülür (istemcide görünür — bu değerler *anon/publishable* anahtarıdır, sorun değil).

Proje köküne **`.env.local`** oluşturun (gitignore'da; GitHub'a gitmez):

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://XXXX.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Değerleri **Supabase → Project Settings → API** sayfasından alın:
- `EXPO_PUBLIC_SUPABASE_URL` → "Project URL"
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` → "anon public" anahtarı

> ⚠️ `service_role` anahtarını asla `EXPO_PUBLIC_*` yapmayın.

### 2. Supabase tarafını tamamlayın
Hesap, panel, içerik yönetimi ve soru bildirimi özelliklerinin web'de de çalışması için:
- 4 migration'ı SQL Editor'de **sırayla** çalıştırın (liste: `docs/ADMIN.md`).
- İlk admini atayın.

### 3. Yerelde doğrulayın

```bash
npm ci
npm run build:web                          # dist/ üretilir
python3 -m http.server 8081 --directory dist   # yerelde dene
```

---

## Yöntem A — Vercel (en kolay, önerilen)

### 1. Repoyu GitHub'a bağlayın
`vercel.json` zaten hazır; Vercel ayarları otomatik okur:
- `buildCommand`: `npm run build:web`
- `outputDirectory`: `dist`
- Otomatik SPA yönlendirme (yenilemede 404 olmaz)

### 2. Projeyi içe aktarın
1. [vercel.com](https://vercel.com) → **Add New → Project**.
2. GitHub'daki `kpssasistani-mobil` reposunu içe aktarın.
3. **Framework Preset:** "Other" bırakın (Vercel, `vercel.json`'u kullanır). Gerekirse
   Build Command'e `npm run build:web`, Output Directory'e `dist` yazın.

### 3. Ortam değişkenlerini ekleyin
Proje → **Settings → Environment Variables**:

| Ad | Değer |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://XXXX.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | anon key |

Ardından **Redeploy** edin (değişkenler ilk deploy'da tanımlı olmazsa privacy hatası görürsünüz — aşağıda).

### 4. Deploy
**Deploy** butonuna basın → `https://kpssasistanim.vercel.app` benzeri bir adrese yayınlanır.
İsterseniz **Domains** bölümünden kendi alan adınızı bağlayın.

---

## Yöntem B — Netlify (alternatif)

`netlify.toml` ekleyin (proje köküne):

```toml
[build]
  command = "npm run build:web"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Sonra [netlify.com](https://netlify.com) → GitHub reposunu bağla → aynı ortam değişkenlerini ekle → deploy.

---

## Yöntem C — Cloudflare Pages (alternatif, hızlı CDN)

- Build command: `npm run build:web`
- Output directory: `dist`
- Ortam değişkenleri: aynı iki `EXPO_PUBLIC_*` değeri.
- SPA yönlendirme için Pages ayarlarından `--routes` ile tek sayfa kuralı ekleyin:
  `/* -> /index.html 200`.

---

## Yöntem D — Kendi sunucunuz (nginx, cPanel, vb.)

`dist/` klasörünü yükleyip SPA düşüşünü şöyle yapın:

**nginx:**

```nginx
server {
  root /var/www/kpssasistani;
  index index.html;
  location / {
    try_files $uri /index.html;
  }
}
```

**Apache (.htaccess):**

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule . /index.html [L]
```

---

## Sık karşılaşılan sorunlar

| Belirti | Neden / çözüm |
| --- | --- |
| "Supabase bağlantısı yapılandırılmamış" | `EXPO_PUBLIC_*` değişkenleri deploy ortamında tanımlı değil. Tanımlayıp **redeploy** edin (Vercel: ortam değişkeni değişince yeni deploy şart). |
| Sayfa yenileyince 404 | SPA rewrite kuralı yok. Vercel için `vercel.json` yeterli; diğer platformlarda yukarıdaki kuralı uygulayın. |
| Giriş yapılamıyor | Supabase Email provider açık değil veya kullanıcı doğrulama bekliyor. Auth ayarlarını kontrol edin. |
| Panel boş/hata | Migration'lar çalıştırılmamış. `docs/ADMIN.md` sırasına göre uygulayın. |
| Değişiklikler görünmüyor | Statik çıktı önbellekte; **Redeploy** (Vercel) yapın. |
| `dist` build'de eski kalıyor | `npx expo export --clear --platform web` ile temiz çıktı alın. |

---

## Ortam değişkeni güvenlik notu

`EXPO_PUBLIC_*` değerleri tarayıcıya gömülür ve herkes okuyabilir. Bu **tasarım gereğidir**:
- Yalnızca **anon/publishable** anahtar kullanın (RLS zaten rollerin ötesinde erişimi engeller).
- `service_role` anahtarı **asla** web'e/istemciye gömülmez; yalnızca `supabase/functions/delete-user`
  Edge Function'ında secret olarak saklanır.
- Spam/kötüye kullanım sınırlaması isterseniz Supabase → Auth → Rate limits / Bot Protection ayarlarına bakın.

---

## Kontrol listesi ✅

- [ ] `.env.local` oluşturuldu (url + anon key)
- [ ] Yerelde `npm run build:web` başarılı
- [ ] Hosting'de ortam değişkenleri tanımlı (deploy'dan önce/sonra redeploy ile)
- [ ] SPA rewrite kuralı aktif (yenilemede 404 yok)
- [ ] Mobil tarayıcıda da denendi
- [ ] Alan adı (opsiyonel) bağlandı
