import type { FastifyInstance } from 'fastify';
import { performance } from 'node:perf_hooks';

export interface IngressLimits {
  requestDeadlineMs: number;
  connectionTimeoutMs: number;
  maxConnections: number;
  maxActiveRequests: number;
  windowMs: number;
  requestsPerWindow: number;
  requestsPerPeer: number;
}

export const DEFAULT_INGRESS_LIMITS: Readonly<IngressLimits> = Object.freeze({
  requestDeadlineMs: 10_000,
  connectionTimeoutMs: 5_000,
  maxConnections: 128,
  maxActiveRequests: 32,
  windowMs: 1_000,
  requestsPerWindow: 60,
  requestsPerPeer: 20,
});

export function installIngress(app: FastifyInstance, limits: IngressLimits): void {
  app.server.maxConnections = limits.maxConnections;
  app.server.headersTimeout = limits.requestDeadlineMs;
  // Bound the entire socket lifetime, including drip-fed headers on reused sockets.
  app.server.on('connection', (socket) => {
    const deadline = setTimeout(() => socket.destroy(), limits.requestDeadlineMs);
    deadline.unref();
    socket.once('close', () => clearTimeout(deadline));
  });
  let windowStart = 0;
  let accepted = 0;
  let active = 0;
  const peers = new Map<string, number>();
  // Unlike an inactivity timeout, this deadline cannot be extended by drip traffic.
  app.addHook('onRequest', async (request, reply) => {
    const now = performance.now();
    if (now - windowStart >= limits.windowMs) {
      windowStart = now;
      accepted = 0;
      peers.clear();
    }
    // Use the socket peer, never untrusted forwarding headers. The global budget
    // also bounds the size of this per-window map under rotating source addresses.
    const peer = request.ip;
    const peerAccepted = peers.get(peer) ?? 0;
    if (accepted >= limits.requestsPerWindow || peerAccepted >= limits.requestsPerPeer ||
        active >= limits.maxActiveRequests) {
      return reply.header('Retry-After', Math.max(1, Math.ceil(limits.windowMs / 1000)))
        .header('Connection', 'close').status(503).send({
          code: 'INTERNAL_ERROR', message: '服务繁忙，请稍后重试', details: {},
        });
    }
    accepted++;
    peers.set(peer, peerAccepted + 1);
    active++;
    const deadline = setTimeout(() => request.raw.destroy(), limits.requestDeadlineMs);
    deadline.unref();
    let released = false;
    const clear = () => {
      clearTimeout(deadline);
      if (!released) { active--; released = true; }
    };
    reply.raw.once('finish', clear);
    reply.raw.once('close', clear);
  });
}
