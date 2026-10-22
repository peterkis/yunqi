import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkProjectGuidance, guidanceDocuments } from '../scripts/check-project-guidance.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function fixture(t) {
  const root = mkdtempSync(resolve(tmpdir(), 'yunqi-guidance-'));
  t.after(() => {
    assert.ok(root.startsWith(resolve(tmpdir(), 'yunqi-guidance-')));
    rmSync(root, { recursive: true, force: true });
  });
  const copy = (path) => {
    const source = resolve(repositoryRoot, path);
    const destination = resolve(root, path);
    if (!existsSync(source)) return;
    mkdirSync(dirname(destination), { recursive: true });
    if (statSync(source).isDirectory()) mkdirSync(destination, { recursive: true });
    else cpSync(source, destination);
  };
  const documents = guidanceDocuments(repositoryRoot);
  for (const path of documents) {
    copy(path);
    // Copy linked targets, without copying or running business packages.
    const markdown = readFileSync(resolve(repositoryRoot, path), 'utf8');
    for (const match of markdown.matchAll(/\]\(([^)]+)\)/g)) {
      const target = match[1].replace(/^<|>$/g, '').split('#')[0];
      if (!target || /^[a-z]+:/i.test(target)) continue;
      copy(relative(repositoryRoot, resolve(repositoryRoot, dirname(path), target)));
    }
  }
  for (const path of [
    'package.json', '.github/workflows/ci.yml',
    'docs/retrospectives/sessions.json', 'docs/retrospectives/guidance-migration.json',
    'docs/retrospectives/evidence/2026-10-18-agents-root-before.md',
    'docs/retrospectives/evidence/2026-10-18-agents-codex-before.md',
  ]) copy(path);
  const write = (path, text) => writeFileSync(resolve(root, path), text);
  const changeJson = (path, change) => {
    const data = JSON.parse(readFileSync(resolve(root, path), 'utf8'));
    change(data);
    write(path, JSON.stringify(data));
  };
  return { root, write, changeJson };
}

test('production guidance and a portable copied fixture both pass', (t) => {
  assert.deepEqual(checkProjectGuidance(repositoryRoot), []);
  assert.deepEqual(checkProjectGuidance(fixture(t).root), []);
});

test('oversized root instructions fail', (t) => {
  const f = fixture(t);
  f.write('AGENTS.md', 'x'.repeat(4097));
  assert.ok(checkProjectGuidance(f.root).some((error) => error.includes('exceeds')));
});

for (const [name, link, message] of [
  ['missing document', '[bad](missing-document.md)', 'broken link'],
  ['missing anchor', '[bad](../agents/workbench.md#nonexistent-section)', 'missing anchor'],
  ['parent escape', '[bad](../../../outside.md)', 'repository escape'],
  ['Windows absolute path', '[bad](C:/outside.md)', 'absolute or unsupported'],
]) {
  test(name + ' fails before delivery', (t) => {
    const f = fixture(t);
    f.write('docs/retrospectives/new-entry.md', link);
    assert.ok(checkProjectGuidance(f.root).some((error) => error.includes(message)));
  });
}

test('a nonexistent pnpm command fails', (t) => {
  const f = fixture(t);
  f.write('docs/retrospectives/new-entry.md', 'Run pnpm nonexistent-guidance-command.');
  assert.ok(checkProjectGuidance(f.root).some((error) => error.includes('unknown pnpm command')));
});

test('historical archive edits fail integrity checks', (t) => {
  const f = fixture(t);
  f.write('docs/retrospectives/evidence/2026-10-18-agents-codex-before.md', 'rewritten history');
  assert.ok(checkProjectGuidance(f.root).some((error) => error.includes('Archive integrity mismatch')));
});

for (const autocrlf of ['true', 'false']) {
  test(`Git preserves original and evidence bytes with core.autocrlf=${autocrlf}`, (t) => {
    const f = fixture(t);
    const migration = JSON.parse(readFileSync(resolve(repositoryRoot,
      'docs/retrospectives/guidance-migration.json'), 'utf8'));
    const originalHashes = JSON.parse(readFileSync(resolve(repositoryRoot,
      'docs/superpowers/verification/evidence/2026-10-18-rules/protected-source-hashes.json'), 'utf8'));
    const protectedPaths = [
      ...migration.archives.map((archive) => archive.path),
      ...Object.keys(originalHashes).map((path) => path.replaceAll('\\', '/')),
    ];
    for (const path of ['.gitattributes', ...protectedPaths]) {
      const destination = resolve(f.root, path);
      mkdirSync(dirname(destination), { recursive: true });
      cpSync(resolve(repositoryRoot, path), destination);
    }
    const git = (...args) => execFileSync('git', args, { cwd: f.root, stdio: ['ignore', 'pipe', 'pipe'] });
    git('init', '--quiet');
    git('config', 'core.autocrlf', autocrlf);
    git('add', '--', '.gitattributes', ...protectedPaths);
    const checkout = resolve(f.root, 'checkout').replaceAll('\\', '/') + '/';
    git('checkout-index', '--all', '--prefix=' + checkout);
    for (const path of protectedPaths) {
      const original = readFileSync(resolve(repositoryRoot, path));
      assert.deepEqual(git('show', ':' + path), original, 'Git blob changed original bytes: ' + path);
      assert.deepEqual(readFileSync(resolve(checkout, path)), original, 'Checkout changed original bytes: ' + path);
    }
  });
}

test('dropping a migrated section fails coverage', (t) => {
  const f = fixture(t);
  f.changeJson('docs/retrospectives/guidance-migration.json', (data) => data.sections.pop());
  assert.ok(checkProjectGuidance(f.root).some((error) => error.includes('section coverage')));
});

test('duplicate sessions fail provenance and counts', (t) => {
  const f = fixture(t);
  f.changeJson('docs/retrospectives/sessions.json', (data) => data.sessions.push(data.sessions[0]));
  assert.ok(checkProjectGuidance(f.root).some((error) => error.includes('duplicate IDs')));
  assert.ok(checkProjectGuidance(f.root).some((error) => error.includes('counts disagree')));
});

test('a cyclic subagent ancestry fails without hanging', (t) => {
  const f = fixture(t);
  f.changeJson('docs/retrospectives/sessions.json', (data) => {
    const child = data.sessions.find((session) => session.kind === 'subagent');
    child.parentId = child.id;
  });
  assert.ok(checkProjectGuidance(f.root).some((error) => error.includes('parent/root chain')));
});

test('a machine-local private log path fails the portable index', (t) => {
  const f = fixture(t);
  f.changeJson('docs/retrospectives/sessions.json', (data) => {
    data.sessions[0].sourcePath = 'C:/private/full-transcript.jsonl';
  });
  assert.ok(checkProjectGuidance(f.root).some((error) => error.includes('private source locator')));
});

test('removing CI and root-test wiring fails', (t) => {
  const f = fixture(t);
  f.write('.github/workflows/ci.yml', 'jobs: {}');
  f.changeJson('package.json', (data) => { data.scripts.test = 'node --test'; });
  const errors = checkProjectGuidance(f.root);
  assert.ok(errors.some((error) => error.includes('missing from CI')));
  assert.ok(errors.some((error) => error.includes('root test')));
});
