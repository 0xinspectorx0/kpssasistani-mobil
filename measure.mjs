import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:8211/', { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(4000);
await page.getByText('Başlayalım', { exact: false }).first().click().catch(()=>{});
await page.waitForTimeout(1500);
await page.getByText('Şimdilik geç', { exact: false }).first().click().catch(()=>{});
await page.waitForTimeout(4000);

const info = await page.evaluate(() => {
  const out = [];
  for (const t of ['Ana Sayfa','Testler','Konular','Güncel','Araçlar','Profil']) {
    const found = [...document.querySelectorAll('div,span')].filter(e => e.childElementCount === 0 && e.textContent.trim() === t);
    for (const el of found) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      out.push({ text: t, w: Math.round(r.width), h: Math.round(r.height), fontSize: cs.fontSize, overflow: cs.overflow, textOverflow: cs.textOverflow, whiteSpace: cs.whiteSpace, scrollW: el.scrollWidth, clientW: el.clientWidth });
    }
  }
  return out;
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
