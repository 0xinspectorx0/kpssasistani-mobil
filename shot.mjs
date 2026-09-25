import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto('http://127.0.0.1:8211/', { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(5000);
await page.screenshot({ path: '/home/user/shot_full.png' });
await page.screenshot({ path: '/home/user/shot_bottom.png', clip: { x: 0, y: 620, width: 390, height: 224 } });
console.log('screenshots alindi');
await browser.close();
