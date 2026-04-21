import {chromium} from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (m) => console.log('[console]', m.type(), m.text()));

await page.goto('https://engineers.ge/', {waitUntil: 'networkidle'});

const before = await page.evaluate(() => ({
  tint: localStorage.getItem('bg-tint'),
  hasClass: document.documentElement.classList.contains('dark'),
  cssVar: document.documentElement.style.getPropertyValue('--bg-tint')
}));
console.log('before:', before);

// Simulate user setting to 52 from dark (20)
await page.evaluate(() => localStorage.setItem('bg-tint', '20'));
await page.reload({waitUntil: 'networkidle'});

const dark = await page.evaluate(() => ({
  tint: localStorage.getItem('bg-tint'),
  hasClass: document.documentElement.classList.contains('dark'),
  cssVar: document.documentElement.style.getPropertyValue('--bg-tint')
}));
console.log('after reload with tint=20:', dark);

await page.evaluate(() => {
  const range = document.querySelector('input[type="range"][aria-label="სიკაშკაშე"]');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(range, '52');
  range.dispatchEvent(new Event('input', {bubbles: true}));
});
await page.waitForTimeout(500);

const after = await page.evaluate(() => ({
  tint: localStorage.getItem('bg-tint'),
  hasClass: document.documentElement.classList.contains('dark'),
  cssVar: document.documentElement.style.getPropertyValue('--bg-tint')
}));
console.log('after slider → 52:', after);

await browser.close();
