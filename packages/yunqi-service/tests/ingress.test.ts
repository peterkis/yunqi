import { connect, type Socket } from 'node:net';
import { get } from 'node:http';
import { once } from 'node:events';
import { afterEach, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { fixedCalendarProvider } from './helpers/fixed-calendar-provider.js';

let app: Awaited<ReturnType<typeof buildApp>>;
const sockets: Socket[] = [];
afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.destroy();
  await app?.close();
});

it('limits a peer over real concurrent HTTP requests despite forged forwarding headers', async () => {
  app = await buildApp({ provider: fixedCalendarProvider, now: () => 1_716_210_000_000,
    ingress: { requestsPerPeer: 1, windowMs: 10_000 } });
  const base = await app.listen({ host: '127.0.0.1', port: 0 });
  const statuses = await Promise.all([1, 2, 3].map((peer) => new Promise<number>((resolve, reject) => {
    get(`${base}/api/v1/yunqi/year/2024`, { agent: false, headers: { 'x-forwarded-for': `192.0.2.${peer}` } }, (res) => {
      res.resume(); res.on('end', () => resolve(res.statusCode!));
    }).on('error', reject);
  })));
  expect(statuses.sort()).toEqual([200, 503, 503]);
});

it.each([0, -1, 1.5, Number.NaN, 2 ** 32])('rejects unsafe ingress configuration %s', async (value) => {
  await expect(buildApp({ provider: fixedCalendarProvider, now: () => 0,
    ingress: { requestDeadlineMs: value } })).rejects.toThrow(RangeError);
});

it('releases the active request budget after a stalled peer disconnects', async () => {
  app = await buildApp({ provider: fixedCalendarProvider, now: () => 1_716_210_000_000,
    ingress: { maxActiveRequests: 1 } });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('Missing TCP address');
  const socket = connect(address.port, '127.0.0.1');
  sockets.push(socket);
  await once(socket, 'connect');
  const continued = once(socket, 'data');
  socket.write('POST /api/v1/yunqi/calculate HTTP/1.1\r\nHost: localhost\r\nExpect: 100-continue\r\nContent-Type: application/json\r\nContent-Length: 900\r\n\r\n');
  expect(String((await continued)[0])).toContain('100 Continue');
  expect((await app.inject({ url: '/api/v1/yunqi/year/2024' })).statusCode).toBe(503);
  socket.destroy();
  await once(socket, 'close');
  await expect.poll(async () => (await app.inject({ url: '/api/v1/yunqi/year/2024' })).statusCode,
    { interval: 50 }).toBe(200);
});

it('closes drip-fed incomplete headers and drops connections beyond the connection budget', async () => {
  app = await buildApp({ provider: fixedCalendarProvider, now: () => 0,
    ingress: { requestDeadlineMs: 200, connectionTimeoutMs: 1000, maxConnections: 1 } });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('Missing TCP address');
  const first = connect(address.port, '127.0.0.1');
  sockets.push(first);
  first.on('error', () => {});
  await once(first, 'connect');
  first.write('GET /health HTTP/1.1\r\nHost: localhost\r\nX-Drip: ');
  const drip = setInterval(() => first.write('x'), 20);
  const second = connect(address.port, '127.0.0.1');
  sockets.push(second);
  second.on('error', () => {});
  try {
    await expect.poll(() => second.destroyed, { interval: 20, timeout: 150 }).toBe(true);
    await expect.poll(() => first.destroyed, { interval: 20, timeout: 600 }).toBe(true);
  } finally { clearInterval(drip); }
});

it('bounds aggregate calculations across peers and recovers after its window', async () => {
  app = await buildApp({
    provider: fixedCalendarProvider, now: () => 1_716_210_000_000,
    ingress: { requestsPerWindow: 2, requestsPerPeer: 2, windowMs: 1000 },
  });
  const first = await app.inject({ url: '/api/v1/yunqi/year/2024', remoteAddress: '127.0.0.2' });
  expect(first.statusCode).toBe(200);
  expect((await app.inject({ url: '/api/v1/yunqi/current', remoteAddress: '127.0.0.3' })).statusCode).toBe(200);
  const denied = await app.inject({ method: 'POST', url: '/api/v1/yunqi/calculate',
    payload: { dateTime: '2024-05-20T21:00:00+08:00' }, remoteAddress: '127.0.0.4' });
  expect(denied.statusCode).toBe(503);
  expect(denied.headers['retry-after']).toBe('1');
  expect(denied.json()).toEqual({ code: 'INTERNAL_ERROR', message: '服务繁忙，请稍后重试', details: {} });
  await new Promise((resolve) => setTimeout(resolve, 1100));
  expect((await app.inject({ url: '/api/v1/yunqi/year/2024' })).json()).toEqual(first.json());
});

it('terminates an incomplete calculate body even while bytes keep arriving', async () => {
  app = await buildApp({
    provider: fixedCalendarProvider,
    now: () => 1_716_210_000_000,
    ingress: { requestDeadlineMs: 150, connectionTimeoutMs: 1000 },
  });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('Missing TCP address');
  const socket = connect(address.port, '127.0.0.1');
  sockets.push(socket);
  socket.on('error', () => {});
  await once(socket, 'connect');
  socket.write('POST /api/v1/yunqi/calculate HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: 900\r\n\r\n{');
  const drip = setInterval(() => socket.write(' '), 25);
  let guard: ReturnType<typeof setTimeout>;
  try {
    const closed = await Promise.race([
      new Promise<boolean>((resolve) => socket.once('close', () => resolve(true))),
      new Promise<boolean>((resolve) => { guard = setTimeout(() => resolve(false), 700); }),
    ]);
    expect(closed).toBe(true);
  } finally {
    clearInterval(drip);
    clearTimeout(guard!);
  }
});
