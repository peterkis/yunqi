import { mkdir, writeFile } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildApp } from '../../packages/yunqi-service/dist/index.js';
import { tyme4tsCalendarProvider } from '../../packages/calendar-adapters/tyme4ts/dist/index.js';

const root = fileURLToPath(new URL('../..', import.meta.url));
const workbenchRoot = resolve(root, 'apps/yunqi-workbench');
const requireWorkbench = createRequire(resolve(workbenchRoot, 'package.json'));
const { createServer } = await import(pathToFileURL(requireWorkbench.resolve('vite')).href);

export default async function globalSetup() {
  const app = await buildApp({
    provider: tyme4tsCalendarProvider,
    now: () => 1_705_759_642_000,
  });
  const previousTarget = process.env.YUNQI_DEV_API_TARGET;
  const previousBase = process.env.VITE_YUNQI_API_BASE_URL;
  let vite;
  let frontend;
  const runDirectory = process.env.YUNQI_BROWSER_RUN_DIRECTORY;
  const evidence = {
    fixedNowEpochMilliseconds: 1_705_759_642_000,
    expectedLocalTime: '2024-01-20T22:07:22+08:00',
    service: 'real local Fastify + tyme4ts',
    frontend: 'Vite same-origin proxy',
    browserChannel: process.env.YUNQI_BROWSER_CHANNEL || 'bundled-chromium',
    cleanupPassed: false,
  };

  const close = async () => {
    let cleanupResults;
    try {
      cleanupResults = await Promise.allSettled([
        frontend?.listening && new Promise((resolveClose, rejectClose) => frontend.close(error => error ? rejectClose(error) : resolveClose())),
        vite?.close(),
        app.close(),
      ]);
    } finally {
      if (previousTarget === undefined) delete process.env.YUNQI_DEV_API_TARGET;
      else process.env.YUNQI_DEV_API_TARGET = previousTarget;
      if (previousBase === undefined) delete process.env.VITE_YUNQI_API_BASE_URL;
      else process.env.VITE_YUNQI_API_BASE_URL = previousBase;
      delete process.env.YUNQI_BROWSER_BASE_URL;
    }
    const cleanupFailures = cleanupResults.filter(result => result.status === 'rejected');
    evidence.cleanupPassed = cleanupFailures.length === 0;
    evidence.cleanupErrors = cleanupFailures.map(result => String(result.reason));
    await writeFile(resolve(runDirectory, 'environment.json'), JSON.stringify(evidence, null, 2));
    if (cleanupFailures.length) throw new AggregateError(cleanupFailures.map(result => result.reason), 'Browser environment cleanup failed');
  };

  try {
    await mkdir(runDirectory, { recursive: true });
    process.env.YUNQI_DEV_API_TARGET = await app.listen({ host: '127.0.0.1', port: 0 });
    process.env.VITE_YUNQI_API_BASE_URL = '';
    frontend = createHttpServer();
    vite = await createServer({
      root: workbenchRoot,
      configFile: resolve(workbenchRoot, 'vite.config.ts'),
      mode: 'test',
      logLevel: 'warn',
      cacheDir: resolve(runDirectory, 'vite-cache'),
      // Override ambient .env settings; this test must use its owned same origin.
      define: { 'import.meta.env.VITE_YUNQI_API_BASE_URL': JSON.stringify('') },
      server: { middlewareMode: true, hmr: false, ws: { server: frontend }, watch: null },
    });
    // Vite treats port=0 as its default port. Own a Node HTTP listener instead
    // so the OS really assigns an unused ephemeral port and no server is reused.
    frontend.on('request', vite.middlewares);
    await new Promise((resolveListen, rejectListen) => {
      frontend.once('error', rejectListen);
      frontend.listen(0, '127.0.0.1', resolveListen);
    });
    const address = frontend.address();
    if (!address || typeof address === 'string') throw new Error('Vite did not bind a TCP port');
    const baseURL = `http://127.0.0.1:${address.port}`;
    process.env.YUNQI_BROWSER_BASE_URL = baseURL;
    evidence.baseURL = baseURL;
    evidence.serviceURL = process.env.YUNQI_DEV_API_TARGET;
    const current = await fetch(`${baseURL}/api/v1/yunqi/current`);
    if (!current.ok || (await current.json()).data.input.localTime !== evidence.expectedLocalTime) {
      throw new Error('Owned browser environment failed its real API readiness check');
    }
    await writeFile(resolve(runDirectory, 'environment.json'), JSON.stringify(evidence, null, 2));
    console.log(`Browser acceptance evidence: ${runDirectory}`);
    return close;
  } catch (error) {
    await close();
    throw error;
  }
}
