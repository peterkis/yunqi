import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, verify } from 'node:crypto';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, readdir, rm, rmdir, unlink, writeFile } from 'node:fs/promises';
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
  const releaseEnvelope = await (await get('/release')).json();
  const manifestDigest = envelope => createHash('sha256').update(Buffer.from(envelope.payload, 'base64')).digest('hex');
  const manifest = verifyResponse(releaseEnvelope, releaseKeys.publicKey);
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
  const legacyPath = '/approve/' + nonce + '/' + manifest.version + '/' + manifest.digest;
  const requestApproval = async digest => verifyResponse(
    await (await get(legacyPath + '/' + digest)).json(), approvalKeys.publicKey);
  const approvePath = legacyPath + '/' + manifestDigest(releaseEnvelope);
  const approved = await requestApproval(manifestDigest(releaseEnvelope));
  assert.deepEqual(approved, { nonce, version: manifest.version, digest: manifest.digest,
    manifest_digest: manifestDigest(releaseEnvelope), allowed: true });

  // A legitimate metadata-only republish must not invalidate downloaded package bytes,
  // but it must immediately invalidate authorization tied to the old WebView2 floor.
  const raised = await publish(root, installer, manifest.version, 150, releaseKeys.privateKey);
  assert.equal(raised.digest, manifest.digest);
  assert.deepEqual(raised.chunks, manifest.chunks);
  const freshEnvelope = await (await get('/release')).json();
  assert.equal(verifyResponse(freshEnvelope, releaseKeys.publicKey).webview_min, 150);
  assert.notEqual(manifestDigest(freshEnvelope), manifestDigest(releaseEnvelope));
  assert.deepEqual(await requestApproval(manifestDigest(releaseEnvelope)), { ...approved, allowed: false });
  assert.deepEqual(await requestApproval(manifestDigest(freshEnvelope)), {
    ...approved, manifest_digest: manifestDigest(freshEnvelope), allowed: true,
  });
  assert.equal((await get(legacyPath)).status, 404, 'old protocol must not authorize an installation');

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


for (const corruption of ['wrong-size', 'same-size']) {
  test('republishing repairs a ' + corruption + ' stored package before activation', async t => {
    const root = await mkdtemp(join(tmpdir(), 'yunqi-republish-'));
    const installer = join(root, 'fixture.exe');
    const bytes = Buffer.from('MZ verified installer in the test fixture');
    const releaseKeys = generateKeyPairSync('ed25519');
    const approvalKeys = generateKeyPairSync('ed25519');
    const service = updateService({ root, releaseKey: releaseKeys.publicKey,
      approvalKey: approvalKeys.privateKey });
    t.after(async () => {
      service.closeAllConnections();
      await new Promise(resolve => service.close(resolve));
      await rm(root, { recursive: true, force: true });
    });
    await writeFile(installer, bytes);
    const initial = await publish(root, installer, '0.1.11', 145, releaseKeys.privateKey);
    const artifact = join(root, 'packages', initial.digest + '.exe');
    const damaged = Buffer.from(bytes);
    damaged[damaged.length - 1] ^= 1;
    await writeFile(artifact, corruption === 'wrong-size' ? damaged.subarray(0, -1) : damaged);
    service.listen(0, '127.0.0.1');
    await once(service, 'listening');
    const url = 'http://127.0.0.1:' + service.address().port;
    const get = path => fetch(url + path, { signal: AbortSignal.timeout(10000) });
    const publishRepair = () => publish(root, installer, '0.1.12', 145, releaseKeys.privateKey);
    const [repaired] = corruption === 'same-size'
      ? await Promise.all([publishRepair(), publishRepair()])
      : [await publishRepair()];
    assert.equal(repaired.digest, initial.digest);
    const latest = await (await get('/release')).json();
    const payload = Buffer.from(latest.payload, 'base64');
    assert.equal(verify(null, payload, releaseKeys.publicKey, Buffer.from(latest.signature, 'base64')), true);
    assert.deepEqual(JSON.parse(payload), repaired);
    const chunk = await get('/chunks/' + repaired.digest + '/0');
    assert.equal(chunk.status, 200);
    assert.deepEqual(Buffer.from(await chunk.arrayBuffer()), bytes);
    assert.deepEqual(await readFile(artifact), bytes);
    assert.deepEqual(await readdir(join(root, 'packages')), [initial.digest + '.exe']);
  });
}

test('failed artifact replacement leaves the previous manifest active', async t => {
  const root = await mkdtemp(join(tmpdir(), 'yunqi-republish-blocked-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const installer = join(root, 'fixture.exe');
  const { privateKey } = generateKeyPairSync('ed25519');
  await writeFile(installer, Buffer.from('MZ first test fixture'));
  await publish(root, installer, '0.1.11', 145, privateKey);
  const active = join(root, 'active.json');
  const previous = await readFile(active);
  const bytes = Buffer.from('MZ new test fixture');
  await writeFile(installer, bytes);
  const digest = createHash('sha256').update(bytes).digest('hex');
  const blocked = join(root, 'packages', digest + '.exe');
  await mkdir(blocked);
  await writeFile(join(blocked, 'keep'), 'cannot overwrite this directory as a package');
  await assert.rejects(publish(root, installer, '0.1.12', 145, privateKey));
  assert.deepEqual(await readFile(active), previous);
  assert.equal((await readdir(join(root, 'packages'))).some(name => name.endsWith('.part')), false);
});
