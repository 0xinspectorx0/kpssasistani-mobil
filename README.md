# KPSS Asistanım — Mobil

Expo SDK 57 / React Native ile KPSS çalışma uygulaması.

```sh
npm ci
npm run web
```

## Özellikler

- **Hesap sistemi**: Profil → Hesabım ile üye ol / giriş yap. Misafir günde 1, üye günde 3,
  VIP sınırsız test çözer.
- **Yönetici paneli** (Profil → Yönetici Paneli): soru bankası, dersler/kategoriler, konular,
  güncel bilgiler, sınav takvimi, hedef sınavlar, taban puanlar ve motivasyon sözleri tek yerden yönetilir.
- **Toplu soru ekleme**: JSON veya satır bazlı metin/CSV ile tek seferde çok soru yüklenir.
- **Kademeli roller**: Yönetici / Editör / Görüntüleyici.
- Merkezi içerik ve kullanıcı kotası Supabase'de tutulur; bağlantı yokken sınırlı salt okunur
  önizleme sunulur.

**[Kurulum, ilk admin hesabı ve kullanım rehberi → docs/ADMIN.md](docs/ADMIN.md)**

```sh
npm run typecheck
npm test
npm run build:web
```
