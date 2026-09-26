import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kpss-onboarding-seen', '1'));
  await page.goto('/Admin');
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
  await page.getByRole('button', { name: 'Matematik konuları', exact: true }).click();
  await page.getByRole('button', { name: 'Üslü ve Köklü Sayılar soruları', exact: true }).click();
  await page.getByLabel('Konuda soru ara').fill('2³ + 3²');
  await expect(page.getByText('1 soru • 0 seçili', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sil', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Tümünü seç (1)', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'İncele', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Önizlemede kayıt yapılamaz' })).toBeDisabled();
  await expect(page.getByLabel('Soru metni')).toHaveValue('2³ + 3² işleminin sonucu kaçtır?');
  await page.getByLabel('E seçeneği', { exact: true }).fill('Yeni seçenek');
  await page.getByRole('radio', { name: 'E doğru cevap' }).click();
  await page.getByRole('button', { name: 'Soru önizlemesi' }).click();
  await expect(page.getByText('E. Yeni seçenek ✓', { exact: true })).toBeVisible();
  await page.getByRole('dialog', { name: 'İçerik düzenleyici' }).getByRole('button', { name: 'Kapat', exact: true }).click();
  await expect(page.getByText('Değişiklikler kaydedilmedi', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Kaydetmeden çık' }).click();
  await page.getByLabel('Konuda soru ara').fill('sonuçbulunamaz123');
  await expect(page.getByText('Bu görünümde soru yok', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Kapat', exact: true }).click();
  await page.getByRole('button', { name: 'Önizlemeyi kapat' }).click();
  await expect(page.getByText('Yönetici girişi', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
