import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {lookup} from 'node:dns/promises';
import {once} from 'node:events';
import {get} from 'node:http';
import {createServer} from 'node:net';
import {resolve} from 'node:path';
import {createInterface} from 'node:readline';
import {pathToFileURL} from 'node:url';

async function available(address) {
  const probe = createServer();
  try {
    probe.listen({host:address,port:0});
    await once(probe,'listening');
    return true;
  } catch(error) {
    if(['EADDRNOTAVAIL','EAFNOSUPPORT','EPROTONOSUPPORT'].includes(error.code)) return false;
    throw error;
  } finally {
    if(probe.listening) await new Promise((done,reject)=>probe.close(error=>error?reject(error):done()));
  }
}

export async function verifyLocalhostHttp(program) {
  const resolved = new Set((await lookup('localhost',{all:true})).map(({address})=>address));
  const addresses = [];
  for(const address of ['127.0.0.1','::1']) {
    if(resolved.has(address) && await available(address)) addresses.push(address);
  }
  assert.ok(addresses.includes('127.0.0.1'),'IPv4 loopback must be available to the default Vite proxy');
  const child=spawn(resolve(program),[],{env:{...process.env,HOST:'localhost',PORT:'0'},stdio:['ignore','pipe','inherit'],windowsHide:true});
  const exit=once(child,'exit');
  const lines=createInterface({input:child.stdout});
  try {
    const [line]=await once(lines,'line',{signal:AbortSignal.timeout(10000)});
    const port=line.match(/^Server listening at http:\/\/(?:127\.0\.0\.1|\[::1\]):(\d+)$/)?.[1];
    assert.ok(Number(port),'Rust localhost startup line with assigned port');
    for(const address of addresses) {
      const url='http://'+(address==='::1'?'[::1]':address)+':'+port+'/health';
      // Do not send loopback probes through environment-configured HTTP proxies.
      const {status,body}=await new Promise((done,reject)=>{
        get(url,{agent:false,signal:AbortSignal.timeout(5000)},response=>{
          let body='';
          response.setEncoding('utf8');
          response.on('data',chunk=>{body+=chunk;});
          response.on('error',reject);
          response.on('end',()=>done({status:response.statusCode,body}));
        }).on('error',reject);
      }).catch(cause=>{throw new Error('HOST=localhost is not reachable at '+url,{cause});});
      assert.equal(status,200,url);
      assert.equal(JSON.parse(body).data.status,'ok',url);
    }
    return {checked:addresses,ipv6Skipped:!addresses.includes('::1')};
  } finally {
    lines.close();child.kill();await exit;
  }
}

if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await verifyLocalhostHttp(process.argv[2])));
}
