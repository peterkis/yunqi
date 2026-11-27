import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, verify } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { publish, updateService } from './update-service.mjs';

test('signed release, bounded concurrent transfer, resume, and signed withdrawal', async t => {
  const root = await mkdtemp(join(tmpdir(), 'yunqi-updates-'));
  const installer = join(root, 'fixture.exe');
  const bytes = Buffer.alloc(2 * 1024 * 1024 + 128, 74);
  bytes.write('MZ');
  await writeFile(installer, bytes);
  const releaseKeys = generateKeyPairSync('ed25519');
  const approvalKeys = generateKeyPairSync('ed25519');
  const release = await publish(root, installer, '0.1.11', 145, releaseKeys.privateKey);
  const service = updateService({ root, releaseKey: releaseKeys.publicKey,
    approvalKey: approvalKeys.privateKey, rate: 2 * 1024 * 1024 });
  t.after(async () => {
    service.closeAllConnections();
    await new Promise(resolve => service.close(resolve));
    await unlink(installer);
    await unlink(join(root, 'packages', release.digest + '.exe'));
    await unlink(join(root, 'active.json')).catch(error => {
      if (error.code !== 'ENOENT') throw error;
    });
    await rmdir(join(root, 'packages'));
    await rmdir(root);
  });
  service.listen(0, '127.0.0.1');
  await once(service, 'listening');
  const url = 'http://127.0.0.1:' + service.address().port;
  const get = path => fetch(url + path, { signal: AbortSignal.timeout(10000) });
  function verifyResponse(envelope, key) {
    const payload = Buffer.from(envelope.payload, 'base64');
    assert.equal(verify(null, payload, key, Buffer.from(envelope.signature, 'base64')), true);
    return JSON.parse(payload);
  }
  const manifest = verifyResponse(await (await get('/release')).json(), releaseKeys.publicKey);
  assert.deepEqual(manifest, release);

  const start = performance.now();
  const first = await get('/chunks/' + manifest.digest + '/0');
  const busy = await get('/chunks/' + manifest.digest + '/1');
  assert.equal(busy.status, 503);
  assert.equal(busy.headers.get('retry-after'), '3');
  const prefix = Buffer.from(await first.arrayBuffer());
  assert.ok(performance.now() - start >= 980, '2 MiB transfers respect the configured 2 MiB/s rate');
  assert.equal(createHash('sha256').update(prefix).digest('hex'), manifest.chunks[0]);

  const resume = await get('/chunks/' + manifest.digest + '/1');
  assert.equal(resume.status, 200);
  const end = Buffer.from(await resume.arrayBuffer());
  assert.deepEqual(Buffer.concat([prefix, end]), bytes);
  const nonce = 'c'.repeat(64);
  const approvePath = '/approve/' + nonce + '/' + manifest.version + '/' + manifest.digest;
  const approved = verifyResponse(await (await get(approvePath)).json(), approvalKeys.publicKey);
  assert.deepEqual(approved, { nonce, version: manifest.version, digest: manifest.digest, allowed: true });

  await writeFile(join(root, 'paused'), '');
  assert.equal((await get(approvePath)).status, 503);
  assert.equal((await get('/release')).status, 503);
  await unlink(join(root, 'paused'));
  assert.equal((await get('/release')).status, 200);

  await unlink(join(root, 'active.json'));
  assert.equal((await get('/release')).status, 204);
  const revoked = verifyResponse(await (await get(approvePath)).json(), approvalKeys.publicKey);
  assert.deepEqual(revoked, { ...approved, allowed: false });
  assert.equal((await get('/chunks/' + manifest.digest + '/1')).status, 404);
});
