// Requires the installed WebView2 to be running with the engineering CDP port.
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.connectOverCDP(process.argv[2], { timeout: 10000 });
  try {
    const page = browser.contexts().flatMap(context => context.pages())
      .find(item => new URL(item.url()).hostname === 'tauri.localhost');
    assert.ok(page, 'installed update UI page');
    await page.bringToFront();
    await page.getByRole('button', { name: '下次启动时安装' }).click({ timeout: 10000 });
    await page.getByText('已预约下次启动时安装').waitFor({ timeout: 10000 });
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
