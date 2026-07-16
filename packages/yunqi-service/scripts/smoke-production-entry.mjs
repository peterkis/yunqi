import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function listeningAddressFromLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return undefined;

  try {
    const entry = JSON.parse(trimmed);
    if (typeof entry.msg !== 'string') return undefined;
    return entry.msg.match(
      /Server listening at (http:\/\/127\.0\.0\.1:\d+)/,
    )?.[1];
  } catch {
    return trimmed.match(
      /Server listening at (http:\/\/127\.0\.0\.1:\d+)/,
    )?.[1];
  }
}

function waitForListeningAddress(child, appendOutput) {
  return new Promise((resolveAddress, reject) => {
    let pending = '';
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('production server did not report its listening address'));
    }, 30_000);

    const cleanup = () => {
      clearTimeout(timeout);
      child.stdout.off('data', onData);
      child.stderr.off('data', onData);
      child.off('exit', onExit);
      child.off('error', onError);
    };

    const onData = (chunk) => {
      const text = chunk.toString();
      appendOutput(text);
      pending += text;
      const lines = pending.split(/\r?\n/);
      pending = lines.pop() ?? '';

      for (const line of lines) {
        const address = listeningAddressFromLine(line);
        if (address) {
          cleanup();
          resolveAddress(address);
          return;
        }
      }
    };

    const onExit = (code) => {
      cleanup();
      reject(new Error(`production server exited with ${code}`));
    };

    const onError = (error) => {
      cleanup();
      reject(error);
    };

    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.once('exit', onExit);
    child.once('error', onError);
  });
}

async function waitForHealth(baseUrl, child) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`production server exited with ${child.exitCode}`);
    }
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // Server startup is still in progress.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error('production server did not become healthy');
}

async function requestJson(baseUrl, path, init) {
  const response = await fetch(baseUrl + path, init);
  const payload = await response.json();
  assert.equal(response.status, 200, JSON.stringify(payload));
  return payload;
}

const server = spawn(process.execPath, ['dist/server.js'], {
  cwd: packageRoot,
  env: {
    ...process.env,
    HOST: '127.0.0.1',
    NODE_ENV: 'production',
    PORT: '0',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';

try {
  const baseUrl = await waitForListeningAddress(
    server,
    (text) => {
      output += text;
    },
  );
  await waitForHealth(baseUrl, server);
  const health = await requestJson(baseUrl, '/health');
  const year = await requestJson(baseUrl, '/api/v1/yunqi/year/2024');
  const current = await requestJson(baseUrl, '/api/v1/yunqi/current');
  const calculation = await requestJson(
    baseUrl,
    '/api/v1/yunqi/calculate',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dateTime: '2024-01-20T22:07:22' }),
    },
  );

  assert.equal(health.data.status, 'ok');
  assert.equal(year.data.ruleVersion, 'YQ-MVP-RULES-1.0.0');
  assert.equal(current.data.input.offset, '+08:00');
  assert.deepEqual(calculation.data.input, {
    localTime: '2024-01-20T22:07:22+08:00',
    epochMilliseconds: 1_705_759_642_000,
    offset: '+08:00',
    calendarTimeStandard: 'BeijingStandardTime+08:00',
  });
  assert.equal(calculation.data.year, 2024);
  assert.equal(calculation.data.currentStep.index, 1);
  assert.equal('timezone' in calculation.data.input, false);
  process.stdout.write('production-smoke: ok\n');
} catch (error) {
  if (output) process.stderr.write(output);
  throw error;
} finally {
  if (server.exitCode === null) {
    server.kill();
    await Promise.race([
      new Promise((resolveExit) => server.once('exit', resolveExit)),
      new Promise((resolveWait) => setTimeout(resolveWait, 2_000)),
    ]);
  }
}
