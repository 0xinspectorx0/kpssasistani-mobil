# KPSS Asistanım — Mobil

Expo SDK 57 / React Native ile KPSS çalışma uygulaması.

```sh
npm ci
npm run web
```

## Yönetici paneli

**Profil → Ayarlar → Yönetici Paneli**

Soru bankası, konular, güncel bilgiler, sınav takvimi, hedef sınavlar, taban puanlar,
motivasyon sözleri ve yönetici yetkileri bu panelden yönetilir.

Gerçek giriş ve merkezi içerik kaydı için Supabase kurulumu gerekir.
Bağlantı yokken yalnızca salt okunur panel önizlemesi sunulur.

**[Kurulum, ilk admin hesabı ve kullanım rehberi → docs/ADMIN.md](docs/ADMIN.md)**

```sh
npm run typecheck
npm test
npm run build:web
```
