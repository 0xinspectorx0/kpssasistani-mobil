// Mock HTTP integration exercises the connected UI, not a real Supabase deployment.
import { expect, test, Page } from '@playwright/test';
import { seedEntries, ContentEntry } from '../../lib/content-schema';
import { isQuestion, LessonEntry } from '../../lib/admin-questions';
const uid = '00000000-0000-0000-0000-000000000001';
async function setup(page: Page, admin = true, empty = false, initialRows?: ContentEntry[], panelRole = admin ? 'admin' : '') {
  let rows: ContentEntry[] = (initialRows ?? (empty ? [] : seedEntries())).map((e) => ({
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
    if (url.pathname.endsWith('/rpc/user_role')) return json(panelRole);
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
      const matches = (e: ContentEntry) => e.id === id && e.kind === kind && url.searchParams.get('updated_at') === `eq.${e.updated_at}`;
      if (method === 'PATCH' || method === 'DELETE') {
        if (!['admin', 'editor'].includes(panelRole) || !rows.some(matches)) return json([]);
      }
      if (method === 'PATCH') {
        rows = rows.map((e) =>
          matches(e)
            ? { ...request.postDataJSON(), updated_at: new Date().toISOString() }
            : e,
        );
        return json([{ id }]);
      }
      if (method === 'DELETE') {
        rows = rows.filter((e) => !matches(e));
        return json([{ id }]);
      }
    }
    return json({ message: `Unhandled test route: ${method} ${url.pathname}` }, 500);
  });
  await page.goto('/Admin');
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
  await expect(page.getByText('48 sorunun tamamı dahil', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /Profil/ }).click();
  await page.getByText('Yönetici Paneli', { exact: true }).click();
  await page.getByRole('button', { name: 'Soru Bankası', exact: true }).click();
  await page.getByRole('button', { name: 'Türkçe konuları', exact: true }).click();
  await page.getByRole('button', { name: 'Sözcükte Anlam soruları', exact: true }).click();
  await page.getByLabel('Konuda soru ara').fill('Yeni yönetici test sorusu');
  await page.getByRole('button', { name: 'Düzenle', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'İçerik düzenleyici' })
    .getByRole('radio', { name: 'Yayında', exact: true })
    .click();
  await page.getByRole('button', { name: 'Kaydet ve yayınla' }).click();
  await expect(page.getByRole('dialog', { name: 'İçerik düzenleyici' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Kapat', exact: true }).click();
  await expect(page.getByText('İçerik kaydedildi ve yayınlandı.', { exact: true })).toBeVisible();
  expect(backend.getRows().find((e) => e.id === created.id)?.status).toBe('published');
  await page.getByRole('button', { name: 'Uygulamaya dön' }).click();
  await page.getByRole('tab', { name: /Testler/ }).click();
  await expect(page.getByText('49 sorunun tamamı dahil', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /Profil/ }).click();
  await page.getByText('Yönetici Paneli', { exact: true }).click();
  await page.getByRole('button', { name: 'Soru Bankası', exact: true }).click();
  await page.getByRole('button', { name: 'Türkçe konuları', exact: true }).click();
  await page.getByRole('button', { name: 'Sözcükte Anlam soruları', exact: true }).click();
  await page.getByLabel('Konuda soru ara').fill('Yeni yönetici test sorusu');
  await page.getByRole('button', { name: 'Düzenle', exact: true }).click();
  await page.getByLabel('Soru metni').fill('Yeni yönetici test sorusu güncellendi');
  await page.getByRole('button', { name: 'Kaydet ve yayınla' }).click();
  await expect(page.getByText('Yeni yönetici test sorusu güncellendi', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sil', exact: true }).click();
  await page.getByRole('button', { name: 'Vazgeç', exact: true }).click();
  expect(backend.getRows().some((e) => e.id === created.id)).toBe(true);
  await page.getByRole('button', { name: 'Sil', exact: true }).click();
  await page.getByRole('button', { name: 'Kalıcı olarak sil' }).click();
  await expect(page.getByRole('dialog', { name: 'Konu ve soru yönetimi' }).getByText('1 soru silindi.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Kapat', exact: true }).click();
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
  await page.goto('/Admin');
  await login(page);
  await expect(page.getByRole('button', { name: 'Hazır içerikleri aktar' })).toBeEnabled();
  expect(errors).toEqual([]);
});

test('topic bubble supports persistent reordering, scoped selection and bulk deletion across pages', async ({ page }) => {
  const seed = seedEntries();
  const lesson = seed.find((e) => e.kind === 'lessons' && e.id === 'turkce') as LessonEntry;
  const sample = seed.filter(isQuestion)[0];
  const questions = Array.from({ length: 25 }, (_, index) => ({
    ...sample, id: `bulk-${index}`,
    payload: { ...sample.payload, id: `bulk-${index}`, question: `Toplu test sorusu ${index}`, topicId: lesson.payload.topics[0].id },
  }));
  const untouched = { ...sample, id: 'keep', payload: { ...sample.payload, id: 'keep', topicId: lesson.payload.topics[1].id } };
  const backend = await setup(page, true, false, [lesson, ...questions, untouched]);
  await login(page);
  await page.getByRole('button', { name: 'Soru Bankası', exact: true }).click();
  await page.getByRole('button', { name: 'Türkçe konuları', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Konu ve soru yönetimi' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Sözcükte Anlam yukarı', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Cümlede Anlam yukarı', exact: true }).click();
  await expect(dialog.getByText('1. Cümlede Anlam', { exact: true })).toBeVisible();
  const saved = backend.getRows().find((e) => e.kind === 'lessons') as LessonEntry;
  expect(saved.payload.topics[0].id).toBe(lesson.payload.topics[1].id);
  expect(saved.payload.topics[1].id).toBe(lesson.payload.topics[0].id);
  await dialog.getByRole('button', { name: 'Kapat', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Soru Bankası', exact: true }).click();
  await page.getByRole('button', { name: 'Türkçe konuları', exact: true }).click();
  await expect(dialog.getByText('1. Cümlede Anlam', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Sözcükte Anlam soruları', exact: true }).click();
  await dialog.getByRole('checkbox').first().click();
  await expect(dialog.getByRole('button', { name: 'Seçilenleri sil (1)', exact: true })).toBeEnabled();
  // Filtering clears selection; selecting all includes the second page, never another topic.
  await dialog.getByLabel('Konuda soru ara').fill('Toplu test sorusu');
  await expect(dialog.getByRole('button', { name: 'Seçilenleri sil (0)', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Tümünü seç (25)', exact: true }).click();
  await dialog.getByRole('button', { name: 'Sonraki', exact: true }).click();
  await expect(dialog.getByRole('checkbox')).toHaveCount(5);
  await expect(dialog.getByRole('checkbox').first()).toBeChecked();
  await dialog.getByRole('button', { name: 'Seçilenleri sil (25)', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '25 soru silinsin mi?' })).toBeVisible();
  await page.getByRole('button', { name: 'Vazgeç', exact: true }).click();
  expect(backend.getRows().filter(isQuestion)).toHaveLength(26);
  await dialog.getByRole('button', { name: 'Seçilenleri sil (25)', exact: true }).click();
  await page.getByRole('button', { name: 'Kalıcı olarak sil', exact: true }).click();
  await expect(dialog.getByText('25 soru silindi.', { exact: true })).toBeVisible();
  expect(backend.getRows().filter(isQuestion).map((q) => q.id)).toEqual(['keep']);
  await expect(dialog.getByText('Bu görünümde soru yok', { exact: true })).toBeVisible();
});

test('bulk deletion reports a version conflict instead of claiming full success', async ({ page }) => {
  const seed = seedEntries();
  const lesson = seed.find((e) => e.kind === 'lessons' && e.id === 'turkce') as LessonEntry;
  const sample = seed.filter(isQuestion)[0];
  const questions = ['one', 'two', 'three'].map((id) => ({
    ...sample, id, payload: { ...sample.payload, id, topicId: 'tr-s1' },
  }));
  const backend = await setup(page, true, false, [lesson, ...questions]);
  await page.route('**/rest/v1/content_entries?**', async (route) => {
    if (route.request().method() === 'DELETE' && new URL(route.request().url()).searchParams.get('id') === 'eq.two') {
      return route.fulfill({ contentType: 'application/json', body: '[]' });
    }
    await route.fallback();
  });
  await login(page);
  await page.getByRole('button', { name: 'Soru Bankası', exact: true }).click();
  await page.getByRole('button', { name: 'Türkçe konuları', exact: true }).click();
  await page.getByRole('button', { name: 'Sözcükte Anlam soruları', exact: true }).click();
  await page.getByRole('button', { name: 'Tümünü seç (3)', exact: true }).click();
  await page.getByRole('button', { name: 'Seçilenleri sil (3)', exact: true }).click();
  await page.getByRole('button', { name: 'Kalıcı olarak sil', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Konu ve soru yönetimi' });
  await expect(dialog.getByRole('alert')).toContainText('Silme işlemi durduruldu');
  await expect(dialog.getByText('1 soru silindi.', { exact: true })).toBeVisible();
  expect(backend.getRows().filter(isQuestion).map((q) => q.id)).toEqual(['two', 'three']);
});

test('viewer cannot reorder topics, select questions or delete them', async ({ page }) => {
  await setup(page, false, false, undefined, 'viewer');
  await login(page);
  await page.getByRole('button', { name: 'Soru Bankası', exact: true }).click();
  await page.getByRole('button', { name: 'Türkçe konuları', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cümlede Anlam yukarı', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Fiiller ve Ek Fiil soruları', exact: true }).click();
  await expect(page.getByRole('button', { name: /Tümünü seç/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Sil', exact: true }).first()).toBeDisabled();
  await expect(page.getByRole('checkbox').first()).toBeDisabled();
});
