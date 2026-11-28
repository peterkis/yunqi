import {
  createHash, createPrivateKey, createPublicKey, generateKeyPairSync, randomUUID, sign, verify,
} from 'node:crypto';
import { constants, createReadStream } from 'node:fs';
import { copyFile, link, lstat, mkdir, open, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import { once } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';
import { finished } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';

const buildVersion = /^(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})\.(0|[1-9]\d{0,8})$/;
const hashPattern = /^[a-f0-9]{64}$/;
const chunkSize = 2 * 1024 * 1024;
const maxPackage = 512 * 1024 * 1024;
const maxManifest = 64 * 1024;

function signed(value, key) {
  const payload = Buffer.from(JSON.stringify(value));
  return {
    payload: payload.toString('base64'),
    signature: sign(null, payload, key).toString('base64'),
  };
}

async function activeRelease(root, key) {
  const path = join(root, 'active.json');
  try {
    if ((await stat(path)).size > maxManifest) throw new Error('oversized manifest');
    const envelope = JSON.parse(await readFile(path, 'utf8'));
    const payload = Buffer.from(envelope.payload, 'base64');
    if (!verify(null, payload, key, Buffer.from(envelope.signature, 'base64'))) {
      throw new Error('invalid manifest signature');
    }
    const release = JSON.parse(payload);
    if (!buildVersion.test(release.version) || release.platform !== 'windows-x64'
      || !hashPattern.test(release.digest) || release.chunk_size !== chunkSize
      || !Number.isSafeInteger(release.length) || release.length < 1 || release.length > maxPackage
      || !Number.isSafeInteger(release.webview_min) || release.webview_min < 1
      || !Array.isArray(release.chunks) || release.chunks.length !== Math.ceil(release.length / chunkSize)
      || !release.chunks.every(hash => hashPattern.test(hash))) {
      throw new Error('invalid manifest');
    }
    return { release, envelope, manifestDigest: createHash('sha256').update(payload).digest('hex') };
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function matchesPackage(path, length, digest) {
  // Reuse only a regular file and hash the same opened file whose size we checked.
  // Close before replacing so Windows can rename a damaged directory entry.
  try {
    if (!(await lstat(path)).isFile()) return false;
    const file = await open(path, 'r');
    try {
      const info = await file.stat();
      if (!info.isFile() || info.size !== length) return false;
      const hash = createHash('sha256');
      let read = 0;
      for await (const bytes of file.createReadStream({ autoClose: false, end: length })) {
        read += bytes.length;
        if (read > length) return false;
        hash.update(bytes);
      }
      return read === length && hash.digest('hex') === digest;
    } finally {
      await file.close();
    }
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

const replacementDelays = [20, 40, 80, 160, 320];
const sharingConflict = error => ['EPERM', 'EBUSY', 'EACCES'].includes(error.code);

async function replaceAtomically(staged, target, replace, alreadyReady = async () => false) {
  for (let attempt = 0; ; attempt++) {
    try {
      if (await alreadyReady()) return;
      // Never unlink the active path before replacing it.
      await replace(staged, target);
      return;
    } catch (error) {
      if (!sharingConflict(error)) throw error;
      if (attempt === replacementDelays.length) {
        // Another publisher may have succeeded while our final rename failed.
        if (await alreadyReady()) return;
        throw error;
      }
      await sleep(replacementDelays[attempt]);
    }
  }
}

export async function publish(root, installer, version, webviewMin, key, { replace = rename } = {}) {
  if (!buildVersion.test(version) || !Number.isSafeInteger(webviewMin) || webviewMin < 1
    || key.asymmetricKeyType !== 'ed25519') throw new Error('invalid release arguments');
  await mkdir(join(root, 'packages'), { recursive: true });
  const staged = join(root, 'packages', randomUUID() + '.part');
  try {
    await copyFile(installer, staged, constants.COPYFILE_EXCL);
    const { size: length } = await stat(staged);
    if (length < 2 || length > maxPackage) throw new Error('installer size out of range');
    const fileHash = createHash('sha256');
    const chunks = [];
    for await (const bytes of createReadStream(staged, { highWaterMark: chunkSize })) {
      if (bytes.length !== chunkSize && (chunks.length + 1 !== Math.ceil(length / chunkSize)
        || bytes.length !== length - chunks.length * chunkSize)) {
        throw new Error('unexpected package read length');
      }
      if (chunks.length === 0 && bytes.subarray(0, 2).toString() !== 'MZ') {
        throw new Error('expected a Windows installer executable');
      }
      fileHash.update(bytes);
      chunks.push(createHash('sha256').update(bytes).digest('hex'));
    }
    const digest = fileHash.digest('hex');
    const artifact = join(root, 'packages', digest + '.exe');
    try {
      await link(staged, artifact);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      // Recheck length and SHA-256 on retry: a concurrent publisher may have
      // repaired the same digest. Otherwise only an atomic rename may repair it.
      await replaceAtomically(staged, artifact, replace, () => matchesPackage(artifact, length, digest));
    }
    const release = { version, platform: 'windows-x64', webview_min: webviewMin,
      length, digest, chunk_size: chunkSize, chunks };
    const manifest = join(root, randomUUID() + '.json');
    await writeFile(manifest, JSON.stringify(signed(release, key)), { flag: 'wx' });
    try {
      await replaceAtomically(manifest, join(root, 'active.json'), replace);
    } finally {
      await unlink(manifest).catch(() => {});
    }
    return release;
  } finally {
    await unlink(staged).catch(() => {});
  }
}

function send(response, status, body, headers = {}) {
  response.writeHead(status, { 'cache-control': 'no-store', ...headers });
  response.end(body);
}

function json(response, body) {
  send(response, 200, JSON.stringify(body), { 'content-type': 'application/json' });
}

export function updateService({ root, releaseKey, approvalKey, rate = 512 * 1024 }) {
  if (releaseKey.asymmetricKeyType !== 'ed25519' || approvalKey.asymmetricKeyType !== 'ed25519'
    || !Number.isSafeInteger(rate) || rate < 65536 || rate > 8 * 1024 * 1024) {
    throw new Error('invalid server configuration');
  }
  let sending = false;
  return createServer({ headersTimeout: 5000, requestTimeout: 10000, keepAliveTimeout: 2000 },
    async (request, response) => {
      response.setTimeout(15000, () => response.destroy());
      if (request.method !== 'GET') return send(response, 405);
      const path = request.url;
      const approval = /^\/approve\/([a-f0-9]{64})\/([0-9.]{5,29})\/([a-f0-9]{64})\/([a-f0-9]{64})$/.exec(path);
      const part = /^\/chunks\/([a-f0-9]{64})\/(0|[1-9]\d{0,2})$/.exec(path);
      if (path !== '/release' && !approval && !part) return send(response, 404);
      if (part && sending) return send(response, 503, undefined, { 'retry-after': '3' });
      if (part) sending = true;
      const abort = new AbortController();
      response.once('close', () => abort.abort());
      try {
        const paused = await stat(join(root, 'paused')).then(() => true, error => {
          if (error.code === 'ENOENT') return false;
          throw error;
        });
        if (paused) return send(response, 503, undefined, { 'retry-after': '30' });
        const active = await activeRelease(root, releaseKey);
        if (path === '/release') return active ? json(response, active.envelope) : send(response, 204);
        if (approval) {
          const [, nonce, version, digest, manifestDigest] = approval;
          if (!buildVersion.test(version)) return send(response, 400);
          const allowed = active?.release.version === version && active.release.digest === digest
            && active.manifestDigest === manifestDigest;
          return json(response, signed({ nonce, version, digest, manifest_digest: manifestDigest, allowed }, approvalKey));
        }
        if (!active || active.release.digest !== part[1]) return send(response, 404);
        const release = active.release;
        const start = Number(part[2]) * chunkSize;
        if (start >= release.length) return send(response, 404);
        const length = Math.min(chunkSize, release.length - start);
        const file = join(root, 'packages', release.digest + '.exe');
        if ((await stat(file)).size !== release.length) throw new Error('package size mismatch');
        response.writeHead(200, { 'cache-control': 'no-store',
          'content-type': 'application/octet-stream', 'content-length': length });
        const stream = createReadStream(file, { start, end: start + length - 1,
          highWaterMark: 64 * 1024, signal: abort.signal });
        for await (const bytes of stream) {
          await sleep(Math.ceil(bytes.length * 1000 / rate), undefined, { signal: abort.signal });
          if (!response.write(bytes)) await once(response, 'drain', { signal: abort.signal });
        }
        response.end();
        await finished(response, { cleanup: true });
      } catch {
        if (response.headersSent || abort.signal.aborted) response.destroy();
        else send(response, 503, undefined, { 'retry-after': '3' });
      } finally {
        if (part) sending = false;
      }
    });
}

async function run([command, ...args]) {
  switch (command) {
    case 'keygen': {
      const [privatePath, publicPath] = args;
      const { privateKey, publicKey } = generateKeyPairSync('ed25519');
      await writeFile(privatePath, privateKey.export({ type: 'pkcs8', format: 'pem' }),
        { mode: 0o600, flag: 'wx' });
      const hex = Buffer.from(publicKey.export({ format: 'jwk' }).x, 'base64url').toString('hex');
      await writeFile(publicPath, hex + '\n', { flag: 'wx' });
      return;
    }
    case 'publish': {
      const [root, installer, version, minimum, keyPath] = args;
      const release = await publish(root, installer, version, Number(minimum),
        createPrivateKey(await readFile(keyPath)));
      console.log(JSON.stringify({ version: release.version, digest: release.digest, length: release.length }));
      return;
    }
    case 'pause': {
      await mkdir(args[0], { recursive: true });
      await writeFile(join(args[0], 'paused'), '');
      return;
    }
    case 'resume':
    case 'withdraw': {
      await unlink(join(args[0], command === 'resume' ? 'paused' : 'active.json')).catch(error => {
        if (error.code !== 'ENOENT') throw error;
      });
      return;
    }
    case 'serve': {
      const [root, releasePublicPath, approvalPrivatePath, host = '127.0.0.1', port = '8780', rate] = args;
      const hex = (await readFile(releasePublicPath, 'utf8')).trim();
      if (!hashPattern.test(hex)) throw new Error('invalid release public key');
      const releaseKey = createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519',
        x: Buffer.from(hex, 'hex').toString('base64url') }, format: 'jwk' });
      const approvalKey = createPrivateKey(await readFile(approvalPrivatePath));
      const server = updateService({ root, releaseKey, approvalKey, rate: rate && Number(rate) });
      server.listen(Number(port), host, () => console.log('YunQi update service listening on ' + host + ':' + port));
      return;
    }
    default: throw new Error('expected keygen, publish, pause, resume, withdraw or serve');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  run(process.argv.slice(2)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
