// Usage: node differential.mjs <original-worktree> <yunqi-probe.exe> [--exhaustive] [--report file]
// For initial baseline generation only, replace the binary with --capture <new-output-file>.
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { runCases, FIXED_NOW } from './cases.mjs';

const [, , original, program, ...flags] = process.argv;
if (!original || !program) throw new Error('Expected original-worktree and yunqi-probe or --capture <new-file>');
const capture = program === '--capture';
const exhaustive = flags.includes('--exhaustive');
const reportAt = flags.indexOf('--report');
const originalSha = execFileSync('git', ['-C', original, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const load = path => import(pathToFileURL(resolve(original, path)));
const [{buildApp}, {tyme4tsCalendarProvider}, {normalizeEpochMilliseconds, formatYunQiCalendarTime}] = await Promise.all([
  load('packages/yunqi-service/dist/app.js'), load('packages/calendar-adapters/tyme4ts/dist/index.js'),
  load('packages/yunqi-service/dist/modules/time-normalizer/index.js'),
]);
const goldenFile = new URL('./goldens.json', import.meta.url);
const goldens = capture ? null : JSON.parse(await readFile(goldenFile, 'utf8'));
if (goldens && goldens.originalSha !== originalSha) throw new Error('Git baseline does not match frozen golden SHA');
const fromReference = createRequire(resolve(original, 'packages/yunqi-service/package.json'));
const Ajv2020 = fromReference('ajv/dist/2020.js').default;
const { parse } = createRequire(resolve(original, 'package.json'))('yaml');
const contract = parse(await readFile(resolve(original, 'packages/yunqi-service/openapi/yunqi-service.openapi.yaml'), 'utf8'));
if (contract.openapi !== '3.1.0' || contract['x-yunqi-contract-id'] !== 'YQ-API-CONTRACT-1.4.0') {
  throw new Error('Unexpected OpenAPI contract');
}
const schemaRoot = 'https://yunqi.local/rust-parity-contract.json';
const ajv = new Ajv2020({ strict: false, allErrors: true });
ajv.addSchema({ $id: schemaRoot, components: { schemas: contract.components.schemas } });
const validators = new Map();
function schemaViolation(request, reply) {
  const path = request.path.replace(/\/year\/[^/]+$/, '/year/{year}');
  const ref = contract.paths[path]?.[request.method.toLowerCase()]?.responses?.[reply.status]?.content?.['application/json']?.schema?.$ref;
  if (!ref) return 'Undeclared response status ' + reply.status + ' for ' + request.method + ' ' + path;
  if (!validators.has(ref)) validators.set(ref, ajv.compile({ $ref: schemaRoot + ref }));
  const validate = validators.get(ref);
  return validate(reply.body) ? null : JSON.stringify(validate.errors).slice(0, 512);
}
const formatLocal = ms => formatYunQiCalendarTime(normalizeEpochMilliseconds(ms)).localTime;
let currentMs = FIXED_NOW;
let clock = 0;
const app = await buildApp({ provider: tyme4tsCalendarProvider, now: () => currentMs, ingressClock: () => (clock += 1000) });
const probe = capture ? null : spawn(resolve(program), [], { stdio: ['pipe', 'pipe', 'inherit'], windowsHide: true });
const exited = probe ? once(probe, 'exit') : null;
const stream = probe ? createInterface({ input: probe.stdout })[Symbol.asyncIterator]() : null;
const digests = {};
const operations = {};
const differences = [];
let compared = 0;
let mismatches = 0;
let goldenCount = 0;
let referenceSchemaChecks = 0;
let rustSchemaChecks = 0;
let rustSchemaFailures = 0;

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}
function digest(value) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}
function firstDifference(a, b, path = '$') {
  if (isDeepStrictEqual(a, b)) return null;
  if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null && Array.isArray(a) === Array.isArray(b)) {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const difference = firstDifference(a[key], b[key], path + '.' + key);
      if (difference) return difference;
    }
  }
  const display = value => String(JSON.stringify(value)).slice(0, 220);
  return { path, expected: display(a), actual: display(b) };
}
function observable(response) {
  return { status: response.status, cacheControl: response.headers?.['cache-control'] ?? null, body: response.body };
}

async function check(label, request, golden) {
  currentMs = request.nowMs ?? FIXED_NOW;
  const response = await app.inject({ method: request.method, url: request.path, payload: request.body });
  const expected = observable({ status: response.statusCode, headers: response.headers, body: response.json() });
  const refSchemaError = schemaViolation(request, expected);
  referenceSchemaChecks++;
  if (refSchemaError) throw new Error('Original contract failure in ' + label + ': ' + refSchemaError);
  if (golden) {
    goldenCount++;
    digests[label] = digest(expected);
    if (goldens && goldens.responses[label] !== digests[label]) throw new Error('Original output diverged from frozen golden: ' + label);
  }
  if (probe) {
    probe.stdin.write(JSON.stringify({ ...request, nowMs: currentMs }) + '\n');
    const timer = setTimeout(() => probe.kill(), 30000);
    let line;
    try { line = await stream.next(); } finally { clearTimeout(timer); }
    if (line.done) throw new Error('Probe ended unexpectedly at ' + label);
    const actual = observable(JSON.parse(line.value));
    const op = request.method + ' ' + request.path.replace(/\/year\/[^/]+$/, '/year/{year}');
    const count = operations[op] ??= { compared: 0, mismatches: 0 };
    compared++;
    count.compared++;
    const schemaError = schemaViolation(request, actual);
    rustSchemaChecks++;
    if (schemaError) rustSchemaFailures++;
    const diff = firstDifference(expected, actual) ?? (schemaError && { path: 'schema', actual: schemaError });
    if (diff) {
      count.mismatches++;
      mismatches++;
      if (differences.length < 50) differences.push({ label, ...diff });
      if (count.mismatches <= 2) console.error(JSON.stringify({ label, ...diff }));
    }
  }
  return expected.body;
}

try {
  await runCases(check, formatLocal, { exhaustive });
  if (capture) {
    if (!flags[0]) throw new Error('Capture requires a new output path');
    await writeFile(flags[0], JSON.stringify({ originalSha, algorithm: 'SHA-256 canonical JSON', responses: digests }, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ originalSha, goldenCount }));
  } else {
    probe.stdin.end();
    const [code, signal] = await exited;
    if (code !== 0) throw new Error('Probe exited ' + code + ' signal=' + signal);
    if (!isDeepStrictEqual(Object.keys(goldens.responses).sort(), Object.keys(digests).sort())) throw new Error('Frozen golden list diverged');
    const report = { originalSha, mode: exhaustive ? 'exhaustive' : 'standard', compared, mismatches, goldenCount, referenceSchemaChecks, rustSchemaChecks, rustSchemaFailures, operations, differences };
    if (reportAt !== -1) await writeFile(flags[reportAt + 1], JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ originalSha, compared, mismatches, goldenCount, referenceSchemaChecks, rustSchemaChecks, rustSchemaFailures, operations }));
    if (mismatches) process.exitCode = 1;
  }
} finally {
  if (probe && probe.exitCode === null && probe.signalCode === null) probe.kill();
  await app.close();
}
