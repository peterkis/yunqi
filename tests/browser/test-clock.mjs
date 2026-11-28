import { AsyncLocalStorage } from 'node:async_hooks';

const clockHeader = 'x-yunqi-browser-fixture-epoch';
const clockedRoutes = new Set([
  'GET /api/v1/yunqi/current',
  'POST /api/v1/yunqi/learning/birth-comparison',
]);

// Registered only on the owned loopback Fastify instance in the browser harness.
// Request-local storage keeps concurrent tests independent and preserves real response generation.
export function createBrowserTestClock(defaultEpoch) {
  const requestClock = new AsyncLocalStorage();
  return {
    now: () => requestClock.getStore() ?? defaultEpoch,
    onRequest(request, _reply, done) {
      const raw = request.headers[clockHeader];
      if (raw === undefined) return done();
      const epoch = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : NaN;
      if (!Number.isSafeInteger(epoch) || !clockedRoutes.has(request.method + ' ' + request.url)) {
        return done(new Error('Unexpected browser fixture clock override'));
      }
      requestClock.run(epoch, done);
    },
  };
}

/** Clock values are scenario fixtures, not browser interpretations of business time. */
export async function routeBirthClock(page, clock) {
  const routeWithTime = (route, time) => {
    const epoch = Date.parse(time);
    if (!Number.isSafeInteger(epoch)) throw new Error('Invalid fixture timestamp: ' + time);
    return route.continue({ headers: { ...route.request().headers(), [clockHeader]: String(epoch) } });
  };
  await page.route('**/api/v1/yunqi/current', route => routeWithTime(route, clock.current));
  await page.route('**/learning/birth-comparison', route => routeWithTime(route, clock.comparison ?? clock.current));
}
