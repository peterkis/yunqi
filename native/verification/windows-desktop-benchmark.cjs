// node windows-desktop-benchmark.cjs <old-exe> <new-exe> <playwright-core-dir> <new-report.json> [rounds]
const assert = require('node:assert/strict');
const { execFile, spawn } = require('node:child_process');
const { createHash } = require('node:crypto');
const { createReadStream } = require('node:fs');
const { mkdtemp, mkdir, rm, rmdir, writeFile } = require('node:fs/promises');
const { createServer } = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { promisify } = require('node:util');
const run = promisify(execFile);
const [oldArg, newArg, playwright, output, roundsText = '3'] = process.argv.slice(2);
if (process.platform !== 'win32' || !output) throw new Error('Requires Windows, both complete app folders, Playwright and report path');
const oldExe = path.resolve(oldArg);
const newExe = path.resolve(newArg);
const { chromium } = require(path.resolve(playwright));
const rounds = Number(roundsText);
assert.ok(Number.isInteger(rounds) && rounds >= 1 && rounds <= 10);
const stats = list => {
  const sorted = [...list].sort((a,b) => a-b);
  const quantile = p => sorted[Math.ceil(p * sorted.length) - 1];
  return { count: list.length, min: sorted[0], p50: quantile(.5), p95: quantile(.95), max: sorted.at(-1) };
};
function systemCpu() {
  let busy = 0, total = 0;
  for (const {times} of os.cpus()) {
    for (const [key, ticks] of Object.entries(times)) {
      total += ticks;
      if (key !== 'idle') busy += ticks;
    }
  }
  return {busy,total};
}
async function sha256(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
async function artifactInfo(executable) {
  const ps = [
    "$ErrorActionPreference='Stop'",
    "$app=Get-Item -LiteralPath $env:YUNQI_MEASURE_FILE",
    "$runtime=Join-Path $app.DirectoryName 'runtime'",
    "$files=@(if(Test-Path -LiteralPath $runtime){Get-ChildItem -LiteralPath $runtime -File -Recurse})",
    "[pscustomobject]@{version=$app.VersionInfo.ProductVersion;exeBytes=$app.Length;runtimeFiles=$files.Count;runtimeBytes=[long](($files | Measure-Object -Property Length -Sum).Sum)} | ConvertTo-Json -Compress",
  ].join(';');
  const { stdout } = await run('powershell.exe', ['-NoProfile','-Command',ps], {
    windowsHide:true, env:{...process.env,YUNQI_MEASURE_FILE:path.resolve(executable)},
  });
  return { path:executable, sha256:await sha256(executable), ...JSON.parse(stdout) };
}
async function freePort() {
  const server = createServer();
  await new Promise((ok, fail) => server.once('error', fail).listen(0, '127.0.0.1', ok));
  const {port} = server.address();
  await new Promise(ok => server.close(ok));
  return port;
}
async function snapshot(pid) {
  const {stdout} = await run('python', [path.join(__dirname, 'windows-process-tree.py'), String(pid)], {windowsHide:true});
  const processes = JSON.parse(stdout.replace(/^\uFEFF/, ''));
  assert.ok(processes.some(row => row.pid === pid));
  assert.ok(processes.some(row => row.name.toLowerCase() === 'msedgewebview2.exe'), 'WebView missing from owned process tree');
  const groups = { all: processes, host: processes.filter(p => p.pid === pid),
    webview: processes.filter(p => p.name.toLowerCase() === 'msedgewebview2.exe'),
    node: processes.filter(p => p.name.toLowerCase() === 'node.exe') };
  return { processes, groups: Object.fromEntries(Object.entries(groups).map(([key, rows]) => [key,
    { count:rows.length, ...Object.fromEntries(['workingSet','privateWorkingSet','privateBytes'].map(metric =>
      [metric,rows.reduce((sum,row) => sum+row[metric],0)])) }])) };
}
async function inspectPage(executable, label, round, profile) {
  // A user's existing single-instance app must never receive this test session.
  const imageName = path.basename(executable);
  const running = await run('tasklist.exe', ['/FI', 'IMAGENAME eq ' + imageName, '/NH', '/FO', 'CSV'], {windowsHide:true});
  if (running.stdout.toLowerCase().includes('"' + imageName.toLowerCase() + '"')) throw new Error('Existing instance: ' + imageName);
  const port = await freePort();
  const endpoint = 'http://127.0.0.1:' + port;
  const cpuStart = systemCpu();
  const start = performance.now();
  const app = spawn(executable, [], { cwd: path.dirname(executable), stdio:'ignore', env: {
    ...process.env, WEBVIEW2_USER_DATA_FOLDER:profile,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port=' + port + ' --remote-debugging-address=127.0.0.1',
  }});
  console.log(label + ' ' + round + ' launched owned PID ' + app.pid);
  app.once('exit', (code, signal) => console.log(label + ' ' + round + ' process exited: ' + code + '/' + signal));
  let browser;
  try {
    let page;
    for (let i=0; i<180 && !page; i++) {
      if (app.exitCode !== null || app.signalCode !== null) throw new Error('Launched process exited before usable');
      if (!browser) {
        try {
          const targets = await (await fetch(endpoint+'/json/list', {signal:AbortSignal.timeout(500)})).json();
          if (targets.some(t => t.url.includes('tauri.localhost'))) browser = await chromium.connectOverCDP(endpoint, {timeout:2000});
        } catch { /* Wait for this test profile's WebView endpoint. */ }
      }
      page = browser?.contexts().flatMap(ctx => ctx.pages()).find(p => { try { return new URL(p.url()).hostname === 'tauri.localhost'; } catch {return false;} });
      if (!page) await delay(100);
    }
    assert.ok(page, 'Owned profile WebView did not become ready');
    await page.waitForFunction(() => window.__TAURI__?.core?.invoke && document.querySelector('.current-all-stages'), undefined, {timeout:30000});
    const ready = await page.evaluate(async () => (await window.__TAURI__.core.invoke('calculate', {
      request: { method:'GET', path:'/api/v1/yunqi/year/2026' } })).status);
    assert.equal(ready,200);
    const readyMs = performance.now()-start;
    console.log(label + ' ' + round + ' ready in ' + readyMs.toFixed(1) + ' ms');
    await delay(2000);
    // A docked panel can stay mounted while its visible strip is only 6 pixels high.
    const viewport = () => page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
    const idle = await snapshot(app.pid);
    idle.viewport = await viewport();
    assert.equal(idle.groups.node.count, label === 'old' ? 1 : 0, 'Unexpected sidecar count');
    console.log(label + ' ' + round + ' idle tree sampled');
    const userAgent = await page.evaluate(() => navigator.userAgent);
    const timings = await page.evaluate(async () => {
      const invoke = request => window.__TAURI__.core.invoke('calculate', {request});
      const year = {method:'GET',path:'/api/v1/yunqi/year/2026'};
      const learning = {method:'POST',path:'/api/v1/yunqi/learning/calculate',body:{dateTime:'2026-11-18T08:44:00+08:00'}};
      const preview = {method:'POST',path:'/api/v1/yunqi/learning/birth-date-preview',body:{calendar:'lunar',year:1990,month:2,day:1}};
      const questionnaire = await invoke({method:'GET',path:'/api/v1/constitution/questionnaire'});
      const form = questionnaire.data.data;
      const answers = Object.fromEntries(form.questions.filter(q => q.sex==='all'||q.sex==='male').map(q => [q.id,1]));
      const assessment = {method:'POST',path:'/api/v1/constitution/assess',body:{questionnaireId:form.id,sex:'male',answers}};
      const cases = { year, learning, lunarPreview:preview, assessment };
      const values = Object.fromEntries(Object.keys(cases).map(key => [key,[]]));
      // At most 13 calls/s keeps the old ingress limit of 20 calls/peer/s out of latency measurements.
      for(let n=0;n<31;n++) for(const [name, request] of Object.entries(cases)) {
        await new Promise(resolve => setTimeout(resolve,80));
        const t0=performance.now();
        const result=await invoke(request);
        const elapsed=performance.now()-t0;
        if (result.status!==200 || result.data.code!=='SUCCESS') throw new Error('Bridge failed: '+name+' '+result.status);
        if(n>0) values[name].push(elapsed);
      }
      return values;
    });
    await delay(2000);
    console.log(label + ' ' + round + ' bridge measurements complete');
    const after = await snapshot(app.pid);
    after.viewport = await viewport();
    const cpuEnd = systemCpu();
    const systemCpuBusyPercent = 100*(cpuEnd.busy-cpuStart.busy)/(cpuEnd.total-cpuStart.total);
    return { label, round, executable, pid:app.pid, userAgent, readyMs, systemCpuBusyPercent, idle, after, timings };
  } finally {
    // Only the page in this run's CDP profile may request a graceful close.
    // A Windows parent PID can be recycled while an older child still lists it.
    if (app.exitCode === null && app.signalCode === null) {
      const exited = new Promise(resolve => app.once('exit', resolve));
      const page = browser?.contexts().flatMap(c => c.pages()).find(p => {
        try { return new URL(p.url()).hostname === 'tauri.localhost'; } catch { return false; }
      });
      if (page) {
        await Promise.race([
          page.evaluate(() => window.__TAURI__.window.getCurrentWindow().close()).catch(() => {}),
          delay(1500),
        ]);
        await Promise.race([exited, delay(1500)]);
      }
      if (app.exitCode === null && app.signalCode === null) app.kill();
      await exited;
    }
    await browser?.close().catch(()=>{});
  }
}
async function main() {
  const root = await mkdtemp(path.join(os.tmpdir(),'yunqi-native-bench-'));
  const report = { os:os.version(), release:os.release(), cpu:os.cpus()[0].model, cores:os.cpus().length,
    root, mode:'release-playwright-cdp', date:new Date().toISOString(), executables:{ old:await artifactInfo(oldExe), rust:await artifactInfo(newExe) }, runs:[] };
  await writeFile(output,JSON.stringify(report,null,2),{flag:'wx'});
  for(let round=1;round<=rounds;round++) {
    const order = round%2 ? ['old','rust'] : ['rust','old'];
    for(const label of order) {
      const profile = path.join(root, round+'-'+label);
      await mkdir(profile);
      const row = await inspectPage(label==='old'?oldExe:newExe,label,round,profile);
      report.runs.push(row);
      await writeFile(output,JSON.stringify(report,null,2));
      console.log(JSON.stringify({label,round,readyMs:row.readyMs,privateWorkingSet:row.idle.groups.all.privateWorkingSet, node:row.idle.groups.node.count}));
      // The profile was freshly created for this owned process and contains no user profile.
      await rm(profile,{recursive:true,force:true,maxRetries:6,retryDelay:250});
      await delay(750);
    }
  }
  report.summary = {};
  for(const label of ['old','rust']) {
    const runs = report.runs.filter(r=>r.label===label);
    const summary = { readyMs:stats(runs.map(r=>r.readyMs)), timings:{}, idle:{}, after:{} };
    for(const op of Object.keys(runs[0].timings)) summary.timings[op] = stats(runs.flatMap(r=>r.timings[op]));
    for(const phase of ['idle','after']) for(const group of Object.keys(runs[0][phase].groups)) {
      summary[phase][group] = Object.fromEntries(Object.keys(runs[0][phase].groups[group]).map(metric => [metric, stats(runs.map(r=>r[phase].groups[group][metric])).p50]));
    }
    report.summary[label] = summary;
  }
  await writeFile(output, JSON.stringify(report,null,2));
  await rmdir(root);
  console.log('Windows release A/B completed: '+output);
}
main().catch(error => {console.error(error);process.exitCode=1;});
