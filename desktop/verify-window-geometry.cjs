// Drive ordinary UI actions against the installed WebView, for the native Windows test.
const {chromium} = require('playwright-core');
const fs = require('node:fs');
const {setTimeout:delay} = require('node:timers/promises');
(async () => {
  let browser;
  for (let i=0;i<70 && !browser;i++) {
    try { browser=await chromium.connectOverCDP('http://127.0.0.1:19382',{timeout:1500}); }
    catch { await delay(250); }
  }
  if (!browser) throw Error('WebView unavailable');
  try {
    let page;
    for(let i=0;i<100 && !page;i++) {
      page=browser.contexts().flatMap(c=>c.pages()).find(p=>new URL(p.url()).hostname==='tauri.localhost');
      if(!page) await delay(150);
    }
    if (!page) throw Error('No local sidebar page');
    page.setDefaultTimeout(8000);
    const op=process.argv[2];
    if(op==='collapse'){
      await page.getByRole('button',{name:'收起为胶囊条',exact:true}).click();
      await page.getByRole('button',{name:/展开运气通/}).waitFor();
    }else if(op==='expand'){
      await page.getByRole('button',{name:/展开运气通/}).click();
      await page.getByRole('button',{name:'收起为胶囊条',exact:true}).waitFor();
    }else if(op==='dark'||op==='light'){
      if(await page.locator('.theme-root').getAttribute('data-theme')!==op)
        await page.getByRole('button',{name:/切换至.*主题/}).click();
      await page.locator('.theme-root[data-theme="'+op+'"]').waitFor();
    }else if(op==='pill'){
      const box=await page.getByRole('button',{name:/展开运气通/}).boundingBox();
      if (!box) throw Error('No pill geometry');
      fs.writeFileSync(process.argv[3],JSON.stringify(box));
    }else if(op==='ready'){
      await page.getByRole('region',{name:'当步运',exact:true}).waitFor();
    }else throw Error('Unknown check');
  }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
