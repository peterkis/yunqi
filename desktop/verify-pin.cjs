// Run against the installed app in an isolated interactive Windows desktop.
const { chromium } = require('playwright-core');
const { execFileSync } = require('node:child_process');
const { join } = require('node:path');
const assert = require('node:assert/strict');
const { setTimeout: delay } = require('node:timers/promises');

async function verify() {
  const restoring = process.argv.includes('--restored');
  let browser;
  for (let i = 0; i < 50 && !browser; i++) {
    try { browser = await chromium.connectOverCDP(process.argv[2], { timeout: 2000 }); }
    catch { await delay(300); }
  }
  assert.ok(browser, 'installed WebView not reachable');
  try {
    let page;
    for (let i = 0; i < 100 && !page; i++) {
      page = browser.contexts().flatMap(c => c.pages()).find(p => new URL(p.url()).hostname === 'tauri.localhost');
      if (!page) await delay(300);
    }
    assert.ok(page, 'WebView did not navigate to the sidebar');
    page.setDefaultTimeout(10000);
    const pin = page.getByRole('button', { name: '窗口置顶', exact: true });
    const waitForPin = value => page.waitForFunction(wanted => {
      const b = document.querySelector('button[aria-label="窗口置顶"]');
      return b && !b.disabled && b.getAttribute('aria-pressed') === String(wanted);
    }, value, {timeout:10000});
    const checkStack = mode => {
      const output = execFileSync('powershell.exe', ['-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass',
        '-File', join(__dirname, 'verify-pin-z.ps1'), mode], { encoding: 'utf8', windowsHide: true, timeout:30000 });
      console.log(output.trim());
    };
    await waitForPin(restoring);
    assert.ok(await pin.evaluate(b => b.previousElementSibling?.getAttribute('aria-label')?.includes('主题')
      && b.nextElementSibling?.getAttribute('aria-label') === '收起为胶囊条'));
    if (!restoring) {
      checkStack('normal');
      await pin.click();
      await waitForPin(true);
      await page.getByRole('button',{name:'收起为胶囊条'}).click();
      await page.getByRole('button',{name:/展开运气通/}).click();
      await waitForPin(true);
      checkStack('pinned');
      if (process.env.YUNQI_TEST_EVIDENCE) await page.screenshot({path:join(process.env.YUNQI_TEST_EVIDENCE,'pinned-light.png')});
      await page.getByRole('button',{name:'切换至深色主题'}).click();
      await page.locator('.theme-root[data-theme="dark"]').waitFor();
      await page.waitForFunction(() => !document.getAnimations().some(a =>
        a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity),
        undefined, { timeout: 5000, polling: 100 });
      await waitForPin(true);
      if (process.env.YUNQI_TEST_EVIDENCE) await page.screenshot({path:join(process.env.YUNQI_TEST_EVIDENCE,'pinned.png')});
    } else {
      checkStack('pinned');
      await pin.click();
      await waitForPin(false);
      checkStack('normal');
    }
    console.log(restoring ? 'PASS restored pin, then unpinned' : 'PASS placement, initial pin, collapse/expand and theme change');
  } finally { await browser.close(); }
}
verify().catch(error => {console.error(error); process.exitCode=1});
