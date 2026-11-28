// Installed-WebView smoke test. The test kit supplies playwright-core, outside the installer.
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { setTimeout: delay } = require('node:timers/promises');

async function verify() {
  const endpoint = process.argv[2];
  let browser;
  for (let i=0; i<100 && !browser; i++) {
    try { browser = await chromium.connectOverCDP(endpoint, {timeout:2000}); }
    catch { await delay(400); }
  }
  assert.ok(browser, 'installed WebView2 did not start');
  let page;
  try {
    for (let i=0; i<100 && !page; i++) {
      page = browser.contexts().flatMap(c => c.pages()).find(p => new URL(p.url()).hostname === 'tauri.localhost');
      if (!page) await delay(300);
    }
    assert.ok(page, 'local application page');
    page.setDefaultTimeout(20000);
    page.on('pageerror', e => console.log('WebView error:',e.message));
    const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
    console.log('Installed page:', page.url(), viewport);
    if (viewport.height < 20) {
      throw new Error('The dock is folded. Supply the owned desktop PID after the CDP endpoint to hold the panel open.');
    }
    await page.getByRole('region',{name:'当步运', exact:true}).waitFor();
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    const facts = await page.evaluate(async () => {
      const call = (method, path, body) => window.__TAURI__.core.invoke('calculate',{request:{method,path,body}});
      const root='/api/v1/yunqi';
      const dateTime='2026-11-18T08:44:00+08:00';
      const replies=[];
      replies.push(await call('GET',root+'/year/2026'));
      replies.push(await call('GET',root+'/current'));
      replies.push(await call('POST',root+'/calculate',{dateTime}));
      replies.push(await call('GET',root+'/learning/current'));
      replies.push(await call('POST',root+'/learning/calculate',{dateTime}));
      replies.push(await call('POST',root+'/learning/birth-comparison',{birthDate:'1990-03-21'}));
      const preview = await call('POST',root+'/learning/birth-date-preview',{calendar:'solar',year:1980,month:3,day:12});
      const byYear = await call('POST',root+'/learning/birth-year-comparison',{year:1980});
      replies.push(preview, byYear);
      const q=await call('GET','/api/v1/constitution/questionnaire');
      replies.push(q);
      const def=q.data.data;
      const answers=Object.fromEntries(def.questions.filter(v=>v.sex==='all'||v.sex==='male').map(v=>[v.id,1]));
      replies.push(await call('POST','/api/v1/constitution/assess',{questionnaireId:def.id,sex:'male',answers}));
      const invalid=await call('POST',root+'/calculate',{dateTime:'invalid'});
      return {statuses:replies.map(r=>r.status), localTime:replies[2].data.data.input.localTime, invalid:invalid.status,
        matches:preview.data.data.matches.length, years:byYear.data.data.candidates.map(c=>c.year)};
    });
    assert.deepEqual(facts.statuses,Array(10).fill(200));
    assert.equal(facts.matches,1);
    assert.deepEqual(facts.years,[1979,1980]);
    assert.equal(facts.invalid,400);
    assert.equal(facts.localTime,'2026-11-18T08:44:00+08:00');
    console.log('10 contract 1.4.0 operations, calendar preview, year comparison, validation error and fixed Beijing time passed');
    const size=()=>page.evaluate(()=>[innerWidth,innerHeight]);
    const expanded=await size();
    assert.ok(Math.abs(expanded[0]-400)<=1, JSON.stringify(expanded));
    await page.getByRole('button',{name:'收起为胶囊条',exact:true}).click();
    await page.waitForFunction(()=>Math.abs(innerWidth-424)<=1&&Math.abs(innerHeight-78)<=1);
    console.log('expanded / pill client dimensions:',expanded,await size());
    if (process.env.YUNQI_TEST_EVIDENCE) {
      await page.screenshot({path:process.env.YUNQI_TEST_EVIDENCE+'/pill.png'});
    }
    await page.getByRole('button',{name:/展开运气通/}).click();
    await page.waitForFunction(()=>Math.abs(innerWidth-400)<=1 && innerHeight>100);
    await page.locator('.current-all-stages > summary').click();
    const timeline=page.getByRole('region',{name:'六气交接时间线'});
    await timeline.waitFor();
    assert.equal(await timeline.locator('.current-stage-row button').count(),6);
    assert.ok(await timeline.evaluate(el=>el.scrollWidth <= el.clientWidth + 1));
    await page.locator('.current-all-stages > summary').click();
    await page.getByRole('link',{name:'指定时点',exact:true}).click();
    const pad=page.getByRole('group',{name:'数字键盘',exact:true});
    await pad.getByRole('button',{name:'清空日期和时刻'}).click();
    for (const digit of '20240229080723') await pad.getByRole('button',{name:digit,exact:true}).click();
    await page.getByRole('button',{name:'开始分析',exact:true}).click();
    await page.getByRole('region',{name:'指定时点分析结果',exact:true}).waitFor();
    await page.goBack();
    await page.getByRole('link',{name:'先天对照',exact:true}).click();
    await page.getByRole('radio',{name:'按出生年份'}).click();
    for (const [name,value] of [['年','1990'],['月','03'],['日','21']]) {
      await page.getByRole('textbox',{name,exact:true}).fill(value);
    }
    await page.getByRole('button',{name:'确认并对照',exact:true}).click();
    await page.getByRole('button',{name:'同时测评体质',exact:true}).waitFor();
    await page.getByRole('link',{name:'体质量表',exact:true}).click();
    await page.getByRole('radio',{name:'男性量表',exact:true}).click();
    const form=page.getByRole('form',{name:'中医体质量表',exact:true});
    for(let n=1;n<=26;n++){
      await form.locator('.constitution-position[aria-label*="当前第 '+n+' 题"]').waitFor();
      await form.getByRole('radiogroup').getByRole('radio').first().click();
    }
    await page.getByRole('region',{name:'体质测评结果',exact:true}).waitFor();
    await page.getByRole('button',{name:'结束并销毁',exact:true}).click();
    await page.getByRole('button',{name:'确认销毁',exact:true}).click();
    await page.getByRole('radio',{name:'男性量表',exact:true}).waitFor();
    await page.getByRole('link',{name:'当下运气',exact:true}).click();
    await page.getByRole('region',{name:'当步运',exact:true}).waitFor();
    if (process.env.YUNQI_TEST_EVIDENCE) await page.screenshot({path:process.env.YUNQI_TEST_EVIDENCE+'/current.png'});
    console.log('Offline UI timeline, specified-time keypad, birth comparison, 26 synthetic responses, scoring and destruction passed');
  } catch(error) {
    if(page) console.error('Page state:',(await page.locator('body').innerText().catch(()=>'' )).slice(0,1200));
    throw error;
  } finally { await browser.close(); }
}
if (process.argv[3]) {
  const { spawnSync } = require('node:child_process');
  const path = require('node:path');
  const helper = path.resolve(__dirname, '../native/verification/windows-normal-start.py');
  const run = spawnSync('python', ['-u', helper, '--with-expanded-window', process.argv[3],
    process.execPath, __filename, process.argv[2]], { stdio: 'inherit', windowsHide: true });
  if (run.error) console.error(run.error.message);
  process.exitCode = run.status ?? 1;
} else {
  verify().catch(error=>{console.error(error.message);process.exitCode=1;});
}
