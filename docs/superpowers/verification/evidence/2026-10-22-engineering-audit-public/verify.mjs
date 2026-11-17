import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(resolve(root, p));
const json = (p) => JSON.parse(read(p).toString('utf8'));
const manifest = json('manifest.json');
for (const item of manifest.artifacts) {
  const full = resolve(root, item.path);
  assert.ok(full.startsWith(root + sep), `path escapes evidence: ${item.path}`);
  const bytes = read(item.path);
  assert.equal(bytes.length, item.bytes, item.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256, item.path);
}
const summary = json('summary.json');
assert.equal(summary.fullTest.status, 'FAIL');
assert.equal(summary.wordRuntimeAudit.initialAttempt, 'FAIL_ECONNRESET');
assert.ok(summary.notRun.includes('Independent expert cases'));
assert.ok(summary.notRun.includes('Clinical G1-G6'));
assert.match(summary.fullTest.retainedSkip, /symlink/i);
assert.match(read('logs/full-test.log.txt').toString('utf8'), /UV_HANDLE_CLOSING/);
assert.match(read('logs/word-runtime-initial-failure.log.txt').toString('utf8'), /ECONNRESET/);
assert.match(read('logs/word-runtime-final.log.txt').toString('utf8'), /"result":\s*"PASS"/);
const browser = json('browser-results.json');
assert.equal(browser.stats.expected, 17);
assert.equal(browser.stats.unexpected, 0);
const paths = [];
const screenshotAttachments = [];
function visit(value) {
  if (typeof value === 'string') { assert.doesNotMatch(value, /\b[A-Z]:[\\/]/i); return; }
  if (Array.isArray(value)) { value.forEach(visit); return; }
  if (!value || typeof value !== 'object') return;
  if (value.contentType === 'application/json' && typeof value.body === 'string') {
    visit(JSON.parse(Buffer.from(value.body, 'base64').toString('utf8')));
  }
  if (Array.isArray(value.attachments)) for (const attachment of value.attachments) {
    if (attachment.path) { paths.push(attachment.path); screenshotAttachments.push(attachment); }
  }
  Object.values(value).forEach(visit);
}
visit(browser);
assert.equal(paths.length, 11);
assert.equal(new Set(paths).size, 10);
assert.equal(screenshotAttachments.find((x) => x.name === 'annual-invalid-boundary-1899').path, screenshotAttachments.find((x) => x.name === 'annual-invalid-boundary-2101').path);
for (const path of paths) {
  const full = resolve(root, path);
  assert.ok(full.startsWith(resolve(root, 'attachments') + sep) && existsSync(full), path);
  assert.ok(manifest.artifacts.some((item) => item.path === path), path);
}
for (const match of read('README.md').toString('utf8').matchAll(/\]\(([^)]+)\)/g)) {
  assert.ok(existsSync(resolve(root, match[1])), match[1]);
}
console.log(`PASS: ${manifest.artifacts.length} evidence files, ${paths.length} screenshot references, historical FAIL/SKIP/NOT_RUN retained`);
