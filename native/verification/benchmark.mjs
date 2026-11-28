// node benchmark.mjs ORIGINAL_REPO NATIVE_RELEASE_PROBE REPORT.json
// One outstanding JSON-line request at a time. Both workers read stdin and write stdout.
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { readFile, writeFile } from 'node:fs/promises';
import { cpus, platform, arch, release } from 'node:os';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const script = fileURLToPath(import.meta.url);
const nowMs = 1_794_801_600_000;
if (process.argv[2] === '--reference-worker') {
  const original = resolve(process.argv[3]);
  const load = path => import(pathToFileURL(resolve(original, path)));
  const [{ buildApp }, { tyme4tsCalendarProvider }] = await Promise.all([
    load('packages/yunqi-service/dist/app.js'), load('packages/calendar-adapters/tyme4ts/dist/index.js'),
  ]);
  // Advance only the synthetic ingress window; application business time remains fixed.
  let clock = 0;
  let now = nowMs;
  const app = await buildApp({ provider: tyme4tsCalendarProvider, now: () => now, ingressClock: () => (clock += 1000) });
  for await (const line of createInterface({ input: process.stdin })) {
    const req = JSON.parse(line);
    now = req.nowMs;
    const res = await app.inject({ method:req.method, url:req.path, payload:req.body });
    const headers = res.headers['cache-control'] ? { 'cache-control':res.headers['cache-control'] } : {};
    const outgoing = '{"status":' + res.statusCode + ',"body":' + res.payload + ',"headers":' + JSON.stringify(headers) + '}\n';
    if (!process.stdout.write(outgoing)) await once(process.stdout, 'drain');
  }
  await app.close();
} else {
  const [, , root, program, reportFile] = process.argv;
  if (!root || !program || !reportFile) throw new Error('Expected original-worktree, release-probe, report.json');
  const original = resolve(root);
  const probe = resolve(program);
  const engines = ['node', 'rust'];
  const post = (path,body) => ({method:'POST',path,body,nowMs});
  const get = path => ({method:'GET',path,nowMs});

  function worker(engine) {
    const child = engine === 'node'
      ? spawn(process.execPath, [script, '--reference-worker', original], {stdio:['pipe','pipe','inherit']})
      : spawn(probe, [], {stdio:['pipe','pipe','inherit']});
    const exit = once(child,'exit');
    const stream = createInterface({ input:child.stdout })[Symbol.asyncIterator]();
    return {
      async request(frame) {
        child.stdin.write(frame);
        const timer=setTimeout(()=>child.kill(),30000);
        try {
          const line=await stream.next();
          if (line.done) throw new Error(engine+' ended before completing request');
          return line.value;
        } finally { clearTimeout(timer); }
      },
      async close() {child.stdin.end(); const [code]=await exit; if (code!==0) throw new Error(engine+' exited '+code);},
      kill() {if (!child.killed && child.exitCode === null) child.kill();},
    };
  }

  function stats(samples) {
    const sorted = [...samples].sort((a,b)=>a-b);
    const rank = p => sorted[Math.ceil(p * sorted.length)-1];
    return {count:samples.length, p50Ms:rank(0.50), p95Ms:rank(0.95), minMs:sorted[0], maxMs:sorted.at(-1), samplesMs:samples};
  }
  const measure = start => Number(process.hrtime.bigint()-start)/1e6;
  const response = s => {
    const reply=JSON.parse(s);
    if (reply.status!==200 || reply.body.code!=='SUCCESS') throw new Error('Non-success response '+s.slice(0,240));
    return reply;
  };
  const encode = r => JSON.stringify(r)+'\n';
  const setup=worker('node');
  const form=response(await setup.request(encode(get('/api/v1/constitution/questionnaire')))).body.data;
  await setup.close();
  const answers=Object.fromEntries(form.questions.filter(q=>['all','male'].includes(q.sex)).map(q=>[q.id,3]));
  const jobs = {
    current:get('/api/v1/yunqi/current'),
    learning:post('/api/v1/yunqi/learning/calculate',{dateTime:'2026-11-18T08:44:00.123'}),
    boundaryBirthday:post('/api/v1/yunqi/learning/birth-comparison',{birthDate:'2024-01-20'}),
    constitution:post('/api/v1/constitution/assess',{questionnaireId:form.id,sex:'male',answers}),
  };
  const frames=Object.fromEntries(Object.entries(jobs).map(([key,req])=>[key,encode(req)]));
  const first=frames.learning;
  const rawCold={node:[],rust:[]};
  const rawWarm={};
  for(const key in jobs) rawWarm[key]={node:[],rust:[]};
  let expectedFirst;
  // Cold trials use fresh worker processes but keep the OS filesystem cache.
  // Do not perform hash, JSON parse, semantic comparisons or child shutdown inside timer.
  for(let i=0;i<30;i++){
    for(const engine of (i%2? [...engines].reverse():engines)){
      const start=process.hrtime.bigint();
      const child=worker(engine);
      try {
        const line=await child.request(first);
        rawCold[engine].push(measure(start));
        const actual=response(line);
        if (expectedFirst && !isDeepStrictEqual(expectedFirst,actual)) throw new Error('Cold output mismatch');
        expectedFirst=actual;
      } finally {await child.close();}
    }
  }
  const clients={node:worker('node'),rust:worker('rust')};
  const observed={};
  try {
    for(let round=-30;round<500;round++){
      for(const [i,key] of Object.keys(frames).entries()){
        for(const engine of ((round+i)%2 ? [...engines].reverse():engines)){
          const start=process.hrtime.bigint();
          const line=await clients[engine].request(frames[key]);
          const duration=measure(start);
          if (round>=0) rawWarm[key][engine].push(duration);
          const actual=response(line);
          if (observed[key] && !isDeepStrictEqual(observed[key],actual)) throw new Error('Warm output mismatch for '+key);
          observed[key]=actual;
        }
      }
    }
  } finally {await Promise.all(engines.map(e=>clients[e].close()));}
  const pack=group=>Object.fromEntries(engines.map(e=>[e,stats(group[e])]));
  const report={
    originalSha:execFileSync('git',['-C',original,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),
    node:process.version,platform:platform()+' '+release()+' '+arch(),cpu:cpus()[0]?.model,
    rustProbe:probe, rustProbeSha256:(await import('node:crypto')).createHash('sha256').update(await readFile(probe)).digest('hex'),
    method:'Single-flight UTF-8 JSONL on OS pipes. Node invokes original Fastify app.inject, Rust invokes dispatch. Cold includes process launch and first successful learning response. OS file cache is warm. Warm uses two long-lived workers, 30 unmeasured per route, 500 measured per route. Engine order alternates. Nearest-rank P50/P95. Both decode requests and serialize full responses. Driver response JSON parse and deep equality are outside the timer. No desktop, WebView or HTTP socket in timing.',
    syntheticRequests:jobs,coldLearning:pack(rawCold),
    warm:Object.fromEntries(Object.entries(rawWarm).map(([key,value])=>[key,pack(value)])),
  };
  await writeFile(reportFile,JSON.stringify(report,null,2)+'\n');
  const table = (group)=>Object.fromEntries(engines.map(e=>[e,{ p50Ms:group[e].p50Ms, p95Ms:group[e].p95Ms }]));
  console.log(JSON.stringify({coldLearning:table(report.coldLearning),warm:Object.fromEntries(Object.entries(report.warm).map(([key,group])=>[key,table(group)]))}));
}
