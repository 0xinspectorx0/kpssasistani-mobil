import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kpss-onboarding-seen', '1'));
  await page.goto('/');
  await page.getByRole('tab', { name: /Profil/ }).click();
  await page.getByText('Yönetici Paneli', { exact: true }).click();
});
test('admin entry is discoverable and disconnected mode cannot authenticate', async ({ page }) => {
  await expect(page.getByText('Yönetici girişi', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Güvenli giriş yap' })).toBeDisabled();
  await expect(page.getByText(/Yönetim altyapısı henüz bağlanmadı/)).toBeVisible();
});
test('read-only panel, question filters and form work on desktop/mobile', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.getByRole('button', { name: 'Paneli salt okunur incele' }).click();
  await expect(page.getByText('Yayındaki içerik', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hazır içerikleri aktar' })).toBeDisabled();
  await page.getByRole('button', { name: 'Soru Bankası', exact: true }).click();
  await page.getByLabel('İçerik ara').fill('2³ + 3²');
  await expect(page.getByText('1 içerik bulundu', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sil', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'İncele', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Önizlemede kayıt yapılamaz' })).toBeDisabled();
  await expect(page.getByLabel('Soru metni')).toHaveValue('2³ + 3² işleminin sonucu kaçtır?');
  await page.getByRole('button', { name: 'E seçeneği ekle' }).click();
  await page.getByLabel('E seçeneği', { exact: true }).fill('Yeni seçenek');
  await page.getByRole('radio', { name: 'E doğru cevap' }).click();
  await page.getByRole('button', { name: 'Soru önizlemesi' }).click();
  await expect(page.getByText('E. Yeni seçenek ✓', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Kapat', exact: true }).click();
  await expect(page.getByText('Değişiklikler kaydedilmedi', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Kaydetmeden çık' }).click();
  await page.getByLabel('İçerik ara').fill('sonuçbulunamaz123');
  await expect(page.getByText('Eşleşen içerik yok', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Önizlemeyi kapat' }).click();
  await expect(page.getByText('Yönetici girişi', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
