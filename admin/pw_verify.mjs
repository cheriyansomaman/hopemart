import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });

// Login page
await page.goto('http://localhost:5173');
await page.waitForLoadState('networkidle');
await page.screenshot({ path: '/tmp/ss_01_login.png', fullPage: true });
console.log('✅ Login page captured');

// Login
try {
  await page.fill('input[type="email"]', 'admin@hopemart.com');
} catch {
  await page.fill('input:first-of-type', 'admin@hopemart.com');
}
await page.fill('input[type="password"]', 'admin123');
await page.screenshot({ path: '/tmp/ss_02_filled.png', fullPage: true });
await page.click('button[type="submit"]');
await page.waitForTimeout(2000);
await page.screenshot({ path: '/tmp/ss_03_after_login.png', fullPage: true });
console.log('URL after login:', page.url());

// Get nav links
const links = await page.$$eval('a', els => els.map(e => ({ href: e.href, text: e.textContent.trim() })).filter(l => l.href.includes('localhost')));
console.log('NAV LINKS:', JSON.stringify(links, null, 2));

// Try each nav section
for (const route of ['/products', '/products/add', '/coupons', '/coupons/add']) {
  await page.goto('http://localhost:5173' + route);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  const fname = '/tmp/ss_' + route.replace(/\//g, '_') + '.png';
  await page.screenshot({ path: fname, fullPage: true });
  console.log('✅ ' + route + ' → ' + fname);
}

await browser.close();
console.log('DONE');
