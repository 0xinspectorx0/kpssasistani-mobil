# 📱 KPSS Asistanım — Android Yayınlama Rehberi

> Hedef: uygulamayı **Android cihazlarda çalışır hâle getirmek** ve **paylaşmak**.
> Yöntem: **EAS Build** (Expo Application Services). Projeniz EAS'e zaten bağlı:
> `projectId: 552f0665-e30d-4f11-9ea9-97bc22a22809`, `owner: arcadalabs`, `android.package: com.kpssasistanim.app`.

---

## Ön hazırlık (bir kez yapılır)

### 1. Supabase tarafını tamamlayın
Uygulama veri olmadan telefonlarda **çalışır ama** hesap sistemi, panel ve içerik yönetimi çalışmaz. Yayına çıkmadan önce:

1. SQL Editor'de migration'ları **sırasıyla** çalıştırın (detay: `docs/ADMIN.md`):
   - `202609220001_admin_content.sql`
   - `202609250001_accounts_roles.sql`
   - `202609250002_user_moderation.sql`
   - `202609250003_question_reports.sql`
2. **Authentication → Providers → Email** açık olsun; üyelik istiyorsanız *"Allow new users to sign up"* açık kalsın.
3. İlk **admin** hesabınızı `docs/ADMIN.md` bölüm 2'deki SQL ile atayın.
4. "Hesabı sil" özelliğini kullanacaksanız Edge Function'ı kurun (`docs/ADMIN.md` → bölüm 5a).

### 2. Supabase anahtarlarını EAS'e tanımlayın
Bu değerler **derleme sırasında** uygulamaya gömülür; EAS bulut derlemesi yerel `.env` dosyanızı görmez, bu yüzden EAS'e tanımlanmalı.

```bash
npx eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://XXXX.supabase.co" \
  --environment production --environment preview --visibility plaintext

npx eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJhbGciOi..." \
  --environment production --environment preview --visibility plaintext

npx eas env:push
```

> **Önemli:** Bu iki anahtar `EXPO_PUBLIC_*` ön ekli olduğu için **istemcide görünür** — sorun değil, bunlar *publishable/anon* anahtarlardır.
> **`service_role` anahtarını ASLA `EXPO_PUBLIC_*` yapmayın**; yalnızca Edge Function secret'ı olarak kullanılır.

Yerel geliştirme içinse proje köküne `.env.local` oluşturun (gitignore'da, güvenli):

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://XXXX.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### 3. EAS'e giriş yapın

```bash
npx eas login          # Expo hesabınızla giriş
npx eas whoami         # arcadalabs görünmeli
```

---

## Yöntem A — Test için APK üretip paylaşmak (önerilen ilk adım)

Bu yöntem **Play Store olmadan** telefonlara kurulabilen bir `.apk` üretir. Test ekibine/arkadaşlara paylaşmak için idealdir.

```bash
npx eas build --platform android --profile preview
```

- İlk kez yapıyorsanız **Android keystore** sorar → **"Generate new keystore"** seçin.
  EAS anahtarı sizin yerinize güvenle saklar.
- Derleme bulutta yapılır (ilk sefer ~10–20 dk).
- Bitince konsolda bir **indirme linki + QR kod** çıkar → telefonla QR'ı okutup APK'yı kurabilirsiniz.
- Ayrıca [expo.dev](https://expo.dev)'deki proje sayfasından da APK'yı indirebilirsiniz.

**Telefonda kurulum:** Ayarlar → "Bilinmeyen kaynaklardan yüklemeye izin ver" gerekebilir (geliştirici imzası Play Store dışı olduğu için normaldir).

### Yerel cihazla hızlı deneme (isteğe bağlı)

```bash
npm ci
npx expo start        # QR ile Expo Go uygulamasında dene
```

> Not: Özel native konfigürasyon (splash, adaptive icon, worklets) tam hâliyle yalnızca EAS APK'sında görünür; Expo Go yaklaşık bir önizlemedir.

---

## Yöntem B — Google Play Store'da yayınlamak

### 1. Google Play Console hesabı
- [play.google.com/console](https://play.google.com/console) → geliştirici hesabı açın (**tek seferlik 25 USD**).
- Uygulamayı oluşturun (paket adı: `com.kpssasistanim.app`).

### 2. Üretim (AAB) derlemesi alın
Play Store artık APK değil **`.aab`** ister:

```bash
npx eas build --platform android --profile production
```

### 3. AAB'yi yükleyin
- EAS derleme sayfasındaki **"Download .aab"** ile dosyayı indirin.
- Play Console → **Release → Production → Create new release** → AAB'yi yükleyin.

### 4. Mağaza listesi + içerik değerlendirmesi
- Uygulama adı, açıklama, ekran görüntüleri, ikon (512×512), kategori, gizlilik politikası (hesap/veri toplandığı için gerekli).
- İçerik derecelendirme anketini doldurun.
- Kaydettikten sonra **incelemeye gönderin** (inceleme birkaç saat–birkaç gün sürebilir).

### 5. Test kanalı (önerilen ara adım)
Herkese açmadan önce **Internal testing / Closed testing** track'ine AAB yükleyip testçileri davet edebilirsiniz — Play Store üzerinden linkle indirirler.

---

## Güncelleme yayınlama (her yeni sürümde)

1. `app.json` içinde **`version`** artırın (`1.0.0` → `1.0.1`).
2. **`android.versionCode`** değerini mutlaka artırın (`1` → `2`). Play Store düşük `versionCode`'lu sürümü reddeder.
3. Yeniden `npx eas build` çalıştırın ve yeni AAB'yi aynı release'e ekleyin.

> Alternatif: `eas.json` içindeki profile `"autoIncrement": true` eklerseniz `versionCode` her build'de otomatik artar.

### Keystore güvenliği (kritik!)

Uygulamayı ilk yayınladığınız **keystore** kaybolursa Play Store'a **güncelleme gönderemezsiniz**.

- EAS keystore'u sizin için saklar ama yerel yedek de alın:
  ```bash
  npx eas credentials   # platform: Android → keystore'u görüntüle/indir
  ```
- İndirdiğiniz keystore + parolaları güvenli bir yerde saklayın.

---

## Opsiyonel: OTA güncellemeleri (expo-updates)

Projede `expo-updates` kurulu ve `runtimeVersion` ayarlı. Derleme gerektirmeyen küçük JS güncellemeleri için:

```bash
npx eas update --branch production --message "açıklama"
```

> Yalnızca JS katmanındaki değişiklikler için geçerlidir; native/`app.json` değişiklikleri yine yeni derleme ister. İlk sürümde zorunlu değildir.

---

## Kontrol listesi ✅

- [ ] Supabase migration'ları çalıştırıldı (5 dosya, sırayla)
- [ ] İlk admin atandı
- [ ] `EXPO_PUBLIC_*` değişkenleri EAS'e tanımlandı (`eas env:push`)
- [ ] `npx eas login` yapıldı
- [ ] Keystore oluşturuldu ve yedeği alındı
- [ ] Preview APK bir telefonda kurulup test edildi
- [ ] (Play Store için) AAB üretildi, mağaza listesi dolduruldu, incelemeye gönderildi
- [ ] Her sürümde `version` + `versionCode` artırılıyor
