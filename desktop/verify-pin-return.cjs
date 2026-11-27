// Installed desktop regression. Drive the actual header, Explorer tray menu, and Windows cursor.
const { chromium } = require('playwright-core');
const { execFileSync } = require('node:child_process');
const { join } = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const assert = require('node:assert/strict');

function native(script, ...args) {
  const log = execFileSync('powershell.exe', ['-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', join(__dirname, script), ...args],
    {encoding: 'utf8', windowsHide: true, timeout: 45000});
  console.log(log.trim());
}
const mouse = phase => native('verify-floating.ps1', '-Phase', phase);
const tray = action => native('verify-edge-menu.ps1', '-Action', action);
const stack = mode => native('verify-pin-z.ps1', mode);

async function main() {
  const phase = process.argv[2];
  let browser;
  for (let i=0; i<100 && !browser; i++) {
    try { browser=await chromium.connectOverCDP('http://127.0.0.1:19382',{timeout:2000}); }
    catch {await delay(250);}
  }
  assert.ok(browser);
  try {
    let page;
    for(let i=0;i<100&&!page;i++){
      page=browser.contexts().flatMap(c=>c.pages()).find(p=>new URL(p.url()).hostname==='tauri.localhost');
      if(!page) await delay(200);
    }
    assert.ok(page); page.setDefaultTimeout(8000);
    const button=page.getByRole('button',{name:'窗口置顶',exact:true});
    const pressed=value=>page.waitForFunction(v=>{
      const b=document.querySelector('button[aria-label="窗口置顶"]');
      return b && !b.disabled && b.getAttribute('aria-pressed')===String(v);
    },value,{timeout:8000});
    const toggle=async value=>{await pressed(!value);await button.click();await pressed(value);};
    const pictures=async stage=>{
      const root=page.locator('.theme-root');
      for(const theme of ['light','dark','light']){
        if(await root.getAttribute('data-theme')!==theme) await page.getByRole('button',{name:/切换至.*主题/}).click();
        await page.locator('.theme-root[data-theme="'+theme+'"]').waitFor();
        await page.waitForFunction(()=>!document.getAnimations().some(a=>a.playState==='running' && a.effect?.getTiming().iterations!==Infinity),undefined,{polling:100,timeout:5000});
        const grip = page.getByRole('button',{name:'调整窗口高度',exact:true});
        const box=await grip.boundingBox(); assert.ok(box);
        if(stage==='after') assert.equal(await grip.evaluate(b=>getComputedStyle(b).backgroundColor),'rgba(0, 0, 0, 0)');
        await page.screenshot({path:join(process.env.YUNQI_TEST_EVIDENCE,stage+'-'+theme+'.png'),clip:{x:box.x,y:box.y-40,width:box.width,height:40+box.height},animations:'disabled'});
      }
    };
    if (phase==='legacy'){
      await pressed(false); await pictures('before'); mouse('Dock'); mouse('Hover');
      await toggle(true); mouse('WaitHidden'); console.log('Reproduced 0.1.6 pinned auto-hide');
    } else if (phase==='upgrade'){
      await pressed(true); mouse('WaitVisible'); stack('pinned'); tray('AssertOff'); await pictures('after');
      await toggle(false); mouse('WaitHidden'); tray('AssertOn'); mouse('Hover');
      await toggle(true); mouse('WaitVisible'); tray('AssertOff'); stack('pinned');
      const height=await page.evaluate(()=>innerHeight);
      await page.getByRole('button',{name:'调整窗口高度'}).press('ArrowUp');
      await page.waitForFunction(h=>innerHeight<h,height,{timeout:5000});
      await toggle(false); mouse('WaitHidden'); mouse('Hover');
      await toggle(true); mouse('MovePinned'); stack('pinned');
      console.log('PASS dock -> pin -> dock, then dragged while pinned');
    } else if(phase==='restart'){
      await pressed(true); mouse('MovedVisible'); stack('pinned'); tray('AssertOff');
      await toggle(false); mouse('MovedVisible'); stack('normal'); tray('AssertOn');
      await toggle(true); await toggle(false); mouse('MovedVisible'); tray('AssertOn');
      tray('Disable'); await toggle(true); await toggle(false); tray('AssertOff'); mouse('MovedVisible');
      await toggle(true); tray('Enable'); await pressed(false); tray('AssertOn'); mouse('MovedVisible');
      mouse('Dock'); mouse('Hover'); await toggle(true); mouse('WaitVisible');
      tray('Enable'); await pressed(false); mouse('WaitHidden'); mouse('Hover'); mouse('Undock');
      console.log('PASS moved position across restart, both floating origins, explicit tray override and re-docking');
    } else throw new Error('Unknown test phase');
  } finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
