import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });

await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await page.fill('input[type="email"]', 'admin@hopemart.com');
await page.fill('input[type="password"]', 'admin123');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);

for (const [route, file] of [
  ['/products', '/tmp/final_products.png'],
  ['/products/add', '/tmp/final_add_product.png'],
  ['/coupons', '/tmp/final_coupons.png'],
  ['/coupons/add', '/tmp/final_add_coupon.png'],
]) {
  await page.goto('http://localhost:5173' + route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: file, fullPage: false });
  console.log('✅ ' + route);
}

await browser.close();
