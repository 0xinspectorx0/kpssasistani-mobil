// Mock HTTP integration exercises the connected UI, not a real Supabase deployment.
import { expect, test, Page } from '@playwright/test';
import { seedEntries, ContentEntry } from '../../lib/content-schema';
const uid = '00000000-0000-0000-0000-000000000001';
async function setup(page: Page, admin = true, empty = false) {
  let rows: ContentEntry[] = (empty ? [] : seedEntries()).map((e) => ({
    ...e,
    updated_at: '2026-09-22T10:00:00.000Z',
  }));
  await page.addInitScript(() => localStorage.setItem('kpss-onboarding-seen', '1'));
  await page.route('https://kpss-test.supabase.co/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const json = (value: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
    if (url.pathname.endsWith('/token')) {
      if (request.postDataJSON()?.password === 'wrong')
        return json({ error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400);
      const jwt = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url');
      return json({
        access_token: `${jwt({ alg: 'HS256', typ: 'JWT' })}.${jwt({ sub: uid, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.test`,
        refresh_token: 'test',
        token_type: 'bearer',
        expires_in: 3600,
        user: {
          id: uid,
          email: 'admin@example.com',
          aud: 'authenticated',
          role: 'authenticated',
          app_metadata: {},
          user_metadata: {},
          created_at: new Date().toISOString(),
        },
      });
    }
    if (url.pathname.endsWith('/logout')) return json({});
    if (url.pathname.endsWith('/rpc/is_admin')) return json(admin);
    if (url.pathname.endsWith('/rpc/user_role')) return json(admin ? 'admin' : '');
    if (url.pathname.endsWith('/rpc/list_admins'))
      return json([{ user_id: uid, email: 'admin@example.com', created_at: new Date().toISOString() }]);
    if (url.pathname.endsWith('/rpc/list_members'))
      return json(
        admin
          ? [{ user_id: uid, email: 'admin@example.com', role: 'admin', created_at: new Date().toISOString() }]
          : [],
      );
    if (url.pathname.endsWith('/admin_audit_log')) return json([]);
    if (url.pathname.endsWith('/content_entries')) {
      const id = url.searchParams.get('id')?.replace('eq.', '');
      const kind = url.searchParams.get('kind')?.replace('eq.', '');
      if (method === 'GET')
        return json(
          rows.filter((e) => url.searchParams.get('status') !== 'eq.published' || e.status === 'published'),
        );
      if (method === 'POST') {
        const entry = request.postDataJSON();
        rows.push({ ...entry, updated_at: new Date().toISOString() });
        return json(null, 201);
      }
      if (method === 'PATCH') {
        rows = rows.map((e) =>
          e.id === id && e.kind === kind
            ? { ...request.postDataJSON(), updated_at: new Date().toISOString() }
            : e,
        );
        return json([{ id }]);
      }
      if (method === 'DELETE') {
        rows = rows.filter((e) => e.id !== id || e.kind !== kind);
        return json([{ id }]);
      }
    }
    return json({ message: `Unhandled test route: ${method} ${url.pathname}` }, 500);
  });
  await page.goto('/');
  await page.getByRole('tab', { name: /Profil/ }).click();
  await page.getByText('Yönetici Paneli', { exact: true }).click();
  return { getRows: () => rows };
}
async function login(page: Page, password = 'test-password') {
  await page.getByLabel('E-posta adresi').fill('admin@example.com');
  await page.getByLabel('Şifre', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Güvenli giriş yap' }).click();
}
test('wrong credentials and authenticated non-admin are denied', async ({ page }) => {
  await setup(page, false);
  await login(page, 'wrong');
  await expect(page.getByText(/E-posta veya şifre hatalı/)).toBeVisible();
  await login(page);
  await expect(page.getByText(/Yönetim yetkiniz yok/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Yeni soru ekle', exact: true })).toHaveCount(0);
});
test('admin can create draft, publish, edit, cancel delete, delete and sign out', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const backend = await setup(page);
  await login(page);
  await page.getByRole('button', { name: 'Yeni soru ekle' }).click();
  await page.getByRole('button', { name: 'Taslak olarak kaydet' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByLabel('Soru metni').fill('Yeni yönetici test sorusu');
  for (const letter of 'ABCDE')
    await page.getByLabel(`${letter} seçeneği`, { exact: true }).fill(`${letter} yanıtı`);
  await page.getByRole('radio', { name: 'E doğru cevap' }).click();
  await page.getByLabel('Çözüm açıklaması').fill('Doğru cevap E seçeneğidir.');
  await page.getByRole('button', { name: 'Taslak olarak kaydet' }).click();
  await expect(page.getByText('Taslak kaydedildi. Öğrencilere gösterilmez.', { exact: true })).toBeVisible();
  const created = backend
    .getRows()
    .find((e) => 'question' in e.payload && e.payload.question === 'Yeni yönetici test sorusu')!;
  expect(created.status).toBe('draft');
  await page.getByRole('button', { name: 'Uygulamaya dön' }).click();
  await page.getByRole('tab', { name: /Testler/ }).click();
  await expect(page.getByText('Tüm derslerden karma sorular • 48 soru', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /Profil/ }).click();
  await page.getByText('Yönetici Paneli', { exact: true }).click();
  await page.getByRole('button', { name: 'Soru Bankası', exact: true }).click();
  await page.getByLabel('İçerik ara').fill('Yeni yönetici test sorusu');
  await page.getByRole('button', { name: 'Düzenle', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'İçerik düzenleyici' })
    .getByRole('radio', { name: 'Yayında', exact: true })
    .click();
  await page.getByRole('button', { name: 'Kaydet ve yayınla' }).click();
  await expect(page.getByText('İçerik kaydedildi ve yayınlandı.', { exact: true })).toBeVisible();
  expect(backend.getRows().find((e) => e.id === created.id)?.status).toBe('published');
  await page.getByRole('button', { name: 'Uygulamaya dön' }).click();
  await page.getByRole('tab', { name: /Testler/ }).click();
  await expect(page.getByText('Tüm derslerden karma sorular • 49 soru', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /Profil/ }).click();
  await page.getByText('Yönetici Paneli', { exact: true }).click();
  await page.getByRole('button', { name: 'Soru Bankası', exact: true }).click();
  await page.getByLabel('İçerik ara').fill('Yeni yönetici test sorusu');
  await page.getByRole('button', { name: 'Düzenle', exact: true }).click();
  await page.getByLabel('Soru metni').fill('Yeni yönetici test sorusu güncellendi');
  await page.getByRole('button', { name: 'Kaydet ve yayınla' }).click();
  await expect(page.getByText('Yeni yönetici test sorusu güncellendi', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sil', exact: true }).click();
  await page.getByRole('button', { name: 'Vazgeç', exact: true }).click();
  expect(backend.getRows().some((e) => e.id === created.id)).toBe(true);
  await page.getByRole('button', { name: 'Sil', exact: true }).click();
  await page.getByRole('button', { name: 'Kalıcı olarak sil' }).click();
  await expect(page.getByText('İçerik silindi.', { exact: true })).toBeVisible();
  expect(backend.getRows().some((e) => e.id === created.id)).toBe(false);
  await page.getByRole('button', { name: 'Çıkış yap', exact: true }).click();
  await page.getByRole('button', { name: 'Çıkış yap', exact: true }).last().click();
  await expect(page.getByText('Yönetici girişi', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('empty configured database does not resurrect bundled content or crash', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await setup(page, true, true);
  await page.getByRole('button', { name: 'Uygulamaya dön' }).click();
  await page.getByRole('tab', { name: /Ana Sayfa/ }).click();
  await expect(page.getByText(/Hedef sınav eklenmedi/)).toBeVisible();
  await page.getByRole('tab', { name: /Testler/ }).click();
  await expect(page.getByText('Tüm derslerden karma sorular • 0 soru', { exact: true })).toBeVisible();
  await expect(page.getByText('Henüz yayında soru yok', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /Profil/ }).click();
  await page.getByText('Yönetici Paneli', { exact: true }).click();
  await login(page);
  await expect(page.getByRole('button', { name: 'Hazır içerikleri aktar' })).toBeEnabled();
  expect(errors).toEqual([]);
});
