const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const root = process.cwd();
const folder = path.join(root, '.artifacts', 'clinician-continuation-20261116');
const expected = process.argv[2];
const git = (...args) => cp.execFileSync('git', args, { encoding: 'utf8' }).trim();
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
if (!/^[0-9a-f]{40}$/.test(expected) || git('rev-parse', 'HEAD') !== expected) throw Error('Unexpected source head');
if (git('status', '--porcelain', '--untracked-files=no')) throw Error('Tracked source is dirty');
const baseline = JSON.parse(fs.readFileSync(path.join(folder, 'original-files-baseline.json'), 'utf8').replace(/^\uFEFF/, ''));
const runs = [];
const commands = [
  { name: 'build', command: 'pnpm build' },
  { name: 'flows', command: 'pnpm exec playwright test tests/browser/learning.flows.spec.mjs tests/browser/birth-assessment.flows.spec.mjs --project=flows-chromium' },
  { name: 'visual', command: 'pnpm exec playwright test tests/browser/workbench.visual.spec.mjs --grep birth-assessment' },
];
for (const item of commands) {
  const env = { ...process.env, YUNQI_BROWSER_CHANNEL: 'chrome' };
  delete env.YUNQI_BROWSER_EXECUTABLE;
  let runDirectory;
  if (item.name !== 'build') {
    runDirectory = path.join(root, '.artifacts', 'browser', 'continuation-' + expected.slice(0, 12) + '-' + item.name);
    if (fs.existsSync(runDirectory)) throw Error('Evidence directory already exists: ' + runDirectory);
    env.YUNQI_BROWSER_RUN_DIRECTORY = runDirectory;
  }
  const log = path.join(folder, 'windows-' + expected.slice(0, 12) + '-' + item.name + '.txt');
  const fd = fs.openSync(log, 'wx');
  console.log(JSON.stringify({ starting: item.name, command: item.command, log }));
  const start = Date.now();
  const result = cp.spawnSync('cmd.exe', ['/d', '/s', '/c', item.command], { cwd: root, env, stdio: ['ignore', fd, fd] });
  fs.closeSync(fd);
  const entry = { ...item, exitCode: result.status, signal: result.signal, error: result.error?.message, durationMs: Date.now() - start, log, runDirectory };
  runs.push(entry);
  console.log(JSON.stringify(entry));
  if (result.status !== 0) break;
}
const sources = git('ls-files', '-z').split('\0').filter(n => /^(apps|packages|scripts|tests|rules)\//.test(n) || ['package.json','pnpm-lock.yaml','playwright.config.mjs'].includes(n)).map(n => ({ path: n, sha256: hash(path.join(root, n)) }));
const build = [];
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) walk(file); else build.push({ path: path.relative(root, file).replaceAll('\\', '/'), sha256: hash(file) });
  }
}
for (const dir of ['apps/yunqi-workbench/dist','packages/yunqi-domain/dist','packages/yunqi-service/dist','packages/yunqi-client/dist','packages/yunqi-contracts/dist','packages/calendar-adapters/tyme4ts/dist']) walk(path.join(root, dir));
const preservation = baseline.files.map(item => ({ path: path.relative(root, item.path).replaceAll('\\','/'), beforeSha256: item.actual, afterSha256: hash(item.path), unchanged: item.actual === hash(item.path) }));
const report = { head: git('rev-parse','HEAD'), branch: git('branch','--show-current'), trackedStatus: git('status','--porcelain','--untracked-files=no'), node: process.version, pnpm: cp.execFileSync('cmd.exe',['/d','/s','/c','pnpm --version'],{encoding:'utf8'}).trim(), platform: process.platform, runs, preservation, sources, build };
fs.writeFileSync(path.join(folder,'windows-' + expected.slice(0,12) + '-state.json'), JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({ head: report.head, trackedStatus: report.trackedStatus, preservedFiles: preservation.length, allPreserved: preservation.every(i=>i.unchanged), sourceFiles: sources.length, buildFiles: build.length, runs: runs.map(({name,exitCode})=>({name,exitCode})) }));
if (runs.length !== commands.length || runs.some(r=>r.exitCode !== 0) || !preservation.every(i=>i.unchanged)) process.exitCode = 1;
