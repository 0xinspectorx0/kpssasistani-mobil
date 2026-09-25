import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('http://127.0.0.1:8211/', { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(4000);
await page.getByText('Başlayalım', { exact: false }).first().click().catch(()=>{});
await page.waitForTimeout(1500);
await page.getByText('Şimdilik geç', { exact: false }).first().click().catch(()=>{});
await page.waitForTimeout(4000);
const info = await page.evaluate(() => {
  const el = [...document.querySelectorAll('div,span')].find(e => e.childElementCount === 0 && e.textContent.trim() === 'Ana Sayfa');
  const chain = [];
  let cur = el;
  for (let i = 0; i < 8 && cur; i++) {
    const r = cur.getBoundingClientRect();
    const cs = getComputedStyle(cur);
    chain.push([i, cur.tagName, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), `${cs.paddingTop}/${cs.paddingRight}/${cs.paddingBottom}/${cs.paddingLeft}`, cs.fontSize]);
    cur = cur.parentElement;
  }
  return chain;
});
console.log(JSON.stringify(info));
await browser.close();
