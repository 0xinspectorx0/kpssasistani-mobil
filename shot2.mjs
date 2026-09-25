import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto('http://127.0.0.1:8211/', { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(4000);

// Onboarding'i geç: Başlayalım'a tıkla (metin ile bul)
const basla = await page.getByText('Başlayalım', { exact: false }).first();
if (await basla.count()) {
  await basla.click();
  await page.waitForTimeout(1500);
  // 2. adım: Şimdilik geç
  const gec = await page.getByText('Şimdilik geç', { exact: false }).first();
  if (await gec.count()) {
    await gec.click();
  }
}
await page.waitForTimeout(4000);
await page.screenshot({ path: '/home/user/shot_tabbar.png', clip: { x: 0, y: 620, width: 390, height: 224 } });
await page.screenshot({ path: '/home/user/shot_full2.png' });
console.log('tabbar alindi');
await browser.close();
