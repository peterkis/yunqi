import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const worker = fileURLToPath(
  new URL('./time-zone-snapshot.mjs', import.meta.url),
);
const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

function snapshot(timeZone) {
  const result = spawnSync(process.execPath, [worker], {
    cwd: packageRoot,
    env: { ...process.env, TZ: timeZone },
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }
  const value = JSON.parse(result.stdout);
  assert.equal(value.environment.requestedTimeZone, timeZone);
  assert.equal(value.environment.effectiveTimeZone, timeZone);
  return value;
}

const utc = snapshot('UTC');
const beijingHost = snapshot('Asia/Shanghai');
assert.notEqual(
  utc.environment.requestedTimeZone,
  beijingHost.environment.requestedTimeZone,
);
assert.equal(
  JSON.stringify(utc.business),
  JSON.stringify(beijingHost.business),
);
process.stdout.write('timezone-independence: ok\n');
