// Real-wire checks must not use fetch: it transparently decompresses a partial gzip response.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {request} from 'node:http';
import {setTimeout as sleep} from 'node:timers/promises';

function wire(url, method, headers) {
  return new Promise((resolve,reject)=>{
    const req=request(url,{method,headers,agent:false},res=>{
      const chunks=[];
      res.on('data',chunk=>chunks.push(chunk));
      res.on('error',reject);
      res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
    });
    req.on('error',reject);
    req.end();
  });
}

export async function verifySwaggerHttp(base) {
  const path='/docs/static/swagger-ui-bundle.js';
  let checks=0;
  async function get(headers={},status=200,method='GET',target=path) {
    const reply=await wire(base+target,method,headers);
    assert.equal(reply.status,status,`${method} ${target} ${JSON.stringify(headers)}`);
    checks++;
    return reply;
  }
  const tag=reply=>reply.headers.etag;
  const digest=data=>'"'+createHash('sha256').update(data).digest('hex')+'"';
  const length=reply=>reply.body.length;
  const identity=await get({'accept-encoding':'identity'});
  const compressed=await get({'accept-encoding':'gzip'});
  assert.equal(tag(identity),digest(identity.body));
  assert.equal(tag(compressed),digest(compressed.body));
  assert.notEqual(tag(identity),tag(compressed));
  assert.equal(identity.headers['accept-ranges'],'bytes');
  assert.equal(identity.headers['content-encoding'],undefined);
  assert.equal(compressed.headers['content-encoding'],'gzip');

  const unchanged=async (headers,variant,method='GET')=>{
    const result=await get(headers,304,method);
    assert.equal(length(result),0);
    assert.equal(tag(result),tag(variant));
    assert.equal(result.headers['content-length'],undefined);
    assert.equal(result.headers['content-range'],undefined);
    for(const header of ['vary','cache-control','accept-ranges','content-security-policy']) {
      assert.equal(result.headers[header],variant.headers[header],header);
    }
  };
  await unchanged({'if-none-match':tag(identity)},identity);
  await unchanged({'if-none-match':`"other,tag", W/${tag(identity)}`},identity);
  await unchanged({'if-none-match':'*','range':'bytes=0-7'},identity);
  await unchanged({'if-none-match':tag(compressed),'accept-encoding':'gzip'},compressed,'HEAD');
  const otherVariant=await get({'if-none-match':tag(identity),'accept-encoding':'gzip'});
  assert.equal(tag(otherVariant),tag(compressed));
  assert.deepEqual(otherVariant.body,compressed.body);
  const conflicting=await get({'if-match':'"wrong"','if-none-match':tag(identity)},412);
  assert.equal(length(conflicting),0);

  async function partial(range,variant,first,last,headers={}) {
    const result=await get({...headers,range},206);
    assert.equal(tag(result),tag(variant));
    assert.equal(result.headers['content-range'],`bytes ${first}-${last}/${length(variant)}`);
    assert.equal(Number(result.headers['content-length']),last-first+1);
    assert.equal(result.headers['content-encoding'],variant.headers['content-encoding']);
    assert.equal(result.headers['cache-control'],variant.headers['cache-control']);
    assert.deepEqual(result.body,variant.body.subarray(first,last+1));
  }
  const huge='1234567890123456789012345678901234567890';
  await partial('bytes=0-31',identity,0,31);
  await partial('bytes=-16',identity,length(identity)-16,length(identity)-1);
  await partial(`bytes=${length(identity)-16}-`,identity,length(identity)-16,length(identity)-1);
  await partial(`bytes=${length(identity)-8}-${huge}`,identity,length(identity)-8,length(identity)-1);
  await partial('bytes=0-15',compressed,0,15,{'accept-encoding':'gzip','if-range':tag(compressed)});
  const outside=await get({range:`bytes=${huge}-`},416);
  assert.equal(outside.headers['content-range'],`bytes */${length(identity)}`);
  assert.equal(length(outside),0);
  // The standalone service admits 20 requests per peer per second.
  await sleep(1100);
  for(const headers of [
    {range:'units=0-7'}, {range:'bytes=0-1,5-7'}, {range:'bytes=5-2'},
    {range:'bytes=0-7','if-range':'"unknown"'},
    {range:'bytes=0-7','if-range':`W/${tag(identity)}`},
  ]) {
    const full=await get(headers);
    assert.equal(full.headers['content-range'],undefined);
    assert.deepEqual(full.body,identity.body);
  }
  const head=await get({range:'bytes=0-7','accept-encoding':'gzip'},200,'HEAD');
  assert.equal(tag(head),tag(compressed));
  assert.equal(Number(head.headers['content-length']),length(compressed));
  assert.equal(head.headers['content-range'],undefined);
  assert.equal(length(head),0);

  const logo=await get({},200,'GET','/docs/static/logo.svg');
  assert.equal(tag(logo),digest(logo.body));
  assert.equal(logo.headers['vary'],undefined);
  const logo304=await get({'if-none-match':tag(logo)},304,'GET','/docs/static/logo.svg');
  assert.equal(tag(logo304),tag(logo));
  assert.equal(length(logo304),0);
  for(const target of ['/docs','/docs/json','/docs/static/swagger-initializer.js']) {
    const current=await get({'if-none-match':'*',range:'bytes=0-7'},200,'GET',target);
    assert.equal(tag(current),undefined,target);
    assert.equal(current.headers['accept-ranges'],undefined,target);
  }
  return checks;
}
