import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });

await page.goto('http://localhost:5173');
await page.fill('input[type="email"]', 'admin@hopemart.com');
await page.fill('input[type="password"]', 'admin123');
await page.click('button[type="submit"]');
await page.waitForTimeout(2000);

// Get bounding boxes of key elements
const boxes = await page.evaluate(() => {
  const sidebar = document.querySelector('aside');
  const main = document.querySelector('main');
  const form = document.querySelector('form');
  const inputs = [...document.querySelectorAll('input')].map(i => ({
    placeholder: i.placeholder,
    rect: i.getBoundingClientRect()
  }));
  return {
    sidebar: sidebar?.getBoundingClientRect(),
    main: main?.getBoundingClientRect(),
    form: form?.getBoundingClientRect(),
    inputs
  };
});
console.log('LAYOUT:', JSON.stringify(boxes, null, 2));

// Screenshot with element highlights
await page.addStyleTag({ content: `
  aside { outline: 3px solid red !important; }
  main { outline: 3px solid blue !important; }
  form { outline: 3px solid green !important; }
` });
await page.screenshot({ path: '/tmp/ss_debug.png' });

await browser.close();
