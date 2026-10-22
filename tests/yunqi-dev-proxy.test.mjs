import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildApp } from '../packages/yunqi-service/dist/index.js';
import { tyme4tsCalendarProvider } from '../packages/calendar-adapters/tyme4ts/dist/index.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const workbenchRoot = resolve(root, 'apps/yunqi-workbench');
const requireWorkbench = createRequire(resolve(workbenchRoot, 'package.json'));
const { createServer } = await import(
  pathToFileURL(requireWorkbench.resolve('vite')).href
);

test('development origin serves real YunQi GET and POST responses through Vite', async () => {
  const app = await buildApp({
    provider: tyme4tsCalendarProvider,
    now: () => 1_705_759_642_000,
  });
  const previousTarget = process.env.YUNQI_DEV_API_TARGET;
  let vite;
  try {
    process.env.YUNQI_DEV_API_TARGET = await app.listen({
      host: '127.0.0.1',
      port: 0,
    });
    vite = await createServer({
      root: workbenchRoot,
      configFile: resolve(workbenchRoot, 'vite.config.ts'),
      mode: 'test',
      logLevel: 'silent',
      server: { host: '127.0.0.1', port: 0, hmr: false, watch: null },
    });
    await vite.listen();
    const address = vite.httpServer.address();
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/v1/yunqi/year/2024`,
    );
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /application\/json/);
    const body = await response.json();
    assert.equal(body.code, 'SUCCESS');
    assert.equal(body.data.year, 2024);

    const baseUrl = `http://127.0.0.1:${address.port}`;
    const current = await fetch(baseUrl + '/api/v1/yunqi/current');
    assert.equal(current.status, 200);
    assert.equal((await current.json()).data.input.localTime, '2024-01-20T22:07:22+08:00');

    const calculate = (dateTime) => fetch(baseUrl + '/api/v1/yunqi/calculate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dateTime }),
    });
    const calculated = await calculate('2024-01-20T22:07:22+08:00');
    assert.equal(calculated.status, 200);
    assert.equal((await calculated.json()).data.input.localTime, '2024-01-20T22:07:22+08:00');
    const invalid = await calculate('invalid');
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).code, 'INVALID_ARGUMENT');
  } finally {
    await vite?.close();
    await app.close();
    if (previousTarget === undefined) delete process.env.YUNQI_DEV_API_TARGET;
    else process.env.YUNQI_DEV_API_TARGET = previousTarget;
  }
});
