// Run against a built baseline and a release binary. Uses dedicated loopback listeners.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {get as httpGet} from 'node:http';
import {resolve} from 'node:path';
import {createInterface} from 'node:readline';
import {pathToFileURL} from 'node:url';
import {setTimeout as sleep} from 'node:timers/promises';
import {writeFile} from 'node:fs/promises';

const [original, program, output] = process.argv.slice(2);
if (!original || !program) throw Error('Expected original-worktree yunqi-http-binary [report.json]');
const load = path => import(pathToFileURL(resolve(original,path)).href);
const [{buildApp},{tyme4tsCalendarProvider:provider}] = await Promise.all([
  load('packages/yunqi-service/dist/app.js'),load('packages/calendar-adapters/tyme4ts/dist/index.js')
]);
let referenceNow=Date.now();
const reference=await buildApp({provider,now:()=>referenceNow});
const referenceUrl=await reference.listen({host:'127.0.0.1',port:0});
const child=spawn(resolve(program),[],{env:{...process.env,HOST:'127.0.0.1',PORT:'0'},stdio:['ignore','pipe','pipe'],windowsHide:true});
const exit=once(child,'exit');
let cases=0;
const checked=[];
try {
  const lines=createInterface({input:child.stdout});
  const [line]=await once(lines,'line',{signal:AbortSignal.timeout(10000)});
  const rustUrl=line.match(/^Server listening at (http:\/\/127\.0\.0\.1:\d+)$/)?.[1];
  assert.ok(rustUrl,'Rust startup line');
  const post=(body, headers={'content-type':'application/json'}) => ({method:'POST',headers,body});
  const json=body=>post(JSON.stringify(body));
  async function check(path,init) {
    const native=await fetch(rustUrl+path,init).catch(error=>{throw Error('Rust HTTP '+path,{cause:error})});
    const value=await native.json();
    // The Rust production clock is real. Inject its emitted timestamp into the independently
    // running reference server only for responses whose content depends on the present instant.
    referenceNow=value?.data?.current?.facts?.input?.epochMilliseconds ??
      value?.data?.facts?.input?.epochMilliseconds ?? value?.data?.input?.epochMilliseconds ?? Date.now();
    const old=await fetch(referenceUrl+path,init).catch(error=>{throw Error('reference HTTP '+path,{cause:error})});
    assert.equal(native.status,old.status,path+' status');
    assert.equal(native.headers.get('cache-control'),old.headers.get('cache-control'),path+' caching');
    assert.deepEqual(value,await old.json(),path+' complete body');
    checked.push(path);cases++;
    return value;
  }
  const y='/api/v1/yunqi';
  const lesson=y+'/learning';
  const scale='/api/v1/constitution';
  await check('/health');
  await check(y+'/year/2024?source=workbench');
  await check(y+'/current');
  await check(y+'/calculate',json({dateTime:'1991-05-21T12:00:00.001+08:00'}));
  await check(lesson+'/current');
  await check(lesson+'/calculate',json({dateTime:'2024-01-20T22:07:22'}));
  await check(lesson+'/birth-comparison',json({birthDate:'2024-01-20'}));
  await check(lesson+'/birth-year-comparison',json({year:2023}));
  await check(lesson+'/birth-date-preview',json({year:2023,month:2,day:1,calendar:'lunar'}));
  const {data:form}=await check(scale+'/questionnaire');
  const answers=Object.fromEntries(form.questions.filter(x=>['all','male'].includes(x.sex)).map(x=>[x.id,1]));
  await check(scale+'/assess',json({questionnaireId:form.id,sex:'male',answers}));
  await check(y+'/calculate',post('{"dateTime":'));
  await check(lesson+'/calculate',post('abc',{'content-type':'text/plain'}));
  await check(lesson+'/calculate',post('abc',{'content-type':'text/html'}));
  await check(y+'/calculate',json({dateTime:'2025-02-29T12:00:00'}));
  await check('/missing?value=sample');
  await check(y+'/year/2024',json({}));
  await check(lesson+'/calculate',post(JSON.stringify({dateTime:' '.repeat(1_048_576)})));
  await sleep(1100);
  for(const p of ['/docs','/docs/','/docs/json','/docs/yaml','/docs/static/swagger-ui-bundle.js','/docs/static/index.css']){
    const [n,o]=await Promise.all([fetch(rustUrl+p),fetch(referenceUrl+p)]);
    assert.equal(n.status,o.status,p);
    assert.equal(n.headers.get('cache-control'),o.headers.get('cache-control'),p+' caching');
    assert.deepEqual(Buffer.from(await n.arrayBuffer()),Buffer.from(await o.arrayBuffer()),p);
    checked.push(p);cases++;
  }
  const staticPath='/docs/static/swagger-ui-bundle.js';
  for(const encoding of ['identity','gzip']){
    const options={headers:{'accept-encoding':encoding}};
    const [head,get]=await Promise.all([fetch(rustUrl+staticPath,{...options,method:'HEAD'}),fetch(rustUrl+staticPath,options)]);
    assert.equal(head.status,200);
    assert.ok(Number(get.headers.get('content-length'))>0);
    assert.equal(head.headers.get('content-length'),get.headers.get('content-length'));
    assert.equal(head.headers.get('content-encoding'),get.headers.get('content-encoding'));
    assert.equal((await head.arrayBuffer()).byteLength,0);
    await get.arrayBuffer();
  }
  for(const [accepted,expected] of [['gzip;q=0.5, identity;q=0','gzip'],['gzip;q=0, *;q=1',null]]){
    const r=await fetch(rustUrl+staticPath,{method:'HEAD',headers:{'accept-encoding':accepted}});
    assert.equal(r.status,200);
    assert.equal(r.headers.get('content-encoding'),expected,accepted);
  }
  // Exercise the published per-peer budget with ordinary /health calls to these owned listeners.
  // One HTTP agent per request avoids a pool transparently repeating a closed keepalive socket.
  const get=base=>new Promise((res,rej)=>httpGet(base+'/health',{agent:false},r=>{
    const buffers=[];r.on('data',b=>buffers.push(b));r.on('end',()=>res({status:r.statusCode,retry:r.headers['retry-after'],body:JSON.parse(Buffer.concat(buffers).toString())}));
  }).on('error',rej));
  await sleep(1100);
  for(let i=0;i<21;i++) {
    const [n,o]=await Promise.all([get(rustUrl),get(referenceUrl)]);
    assert.deepEqual(n,o,'per-peer budget '+i);assert.equal(n.status,i===20?503:200);
  }
  await sleep(1100);
  const [resumed,oldResumed]=await Promise.all([get(rustUrl),get(referenceUrl)]);
  assert.equal(resumed.status,200);assert.deepEqual(resumed,oldResumed);
  const result={matchedRequests:cases, matchedChecks:checked, headEncodingsChecked:['identity','gzip'],weightedEncodingsChecked:2,rateWindowAccepted:20,rateWindowRejected:1,recovered:resumed.status};
  if(output) await writeFile(output,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
} finally {
  child.kill();await exit;await reference.close();
}
