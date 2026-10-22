import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const requiredDocuments = [
  'AGENTS.md',
  'codex/AGENTS.md',
  'README.md',
  'CODING_STANDARDS.md',
  'docs/agents/README.md',
  'docs/agents/rules-and-time.md',
  'docs/agents/api-contracts.md',
  'docs/agents/workbench.md',
  'docs/agents/clinical-scope.md',
  'docs/agents/verification.md',
  'docs/agents/history-and-evidence.md',
  'docs/retrospectives/README.md',
  'docs/retrospectives/2026-10-18-retrospective.md',
  'docs/retrospectives/2026-10-18-sources.md',
  'docs/retrospectives/2026-10-18-guidance-migration.md',
  'docs/retrospectives/2026-10-18-validation.md',
];
const taskDocuments = requiredDocuments.filter(
  (path) => path.startsWith('docs/agents/') && !path.endsWith('history-and-evidence.md'),
);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const lineCount = (text) =>
  text ? text.split(/\r?\n/).length - (text.endsWith('\n') ? 1 : 0) : 0;
const inside = (root, path) => {
  const rel = relative(root, path);
  return rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel);
};

export function guidanceDocuments(root) {
  const paths = new Set(requiredDocuments);
  for (const directory of ['docs/agents', 'docs/retrospectives']) {
    const path = resolve(root, directory);
    if (!existsSync(path)) continue;
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.md')) paths.add(directory + '/' + entry.name);
    }
  }
  return [...paths].sort();
}

function anchors(markdown) {
  const found = new Set();
  const repeats = new Map();
  for (const match of markdown.matchAll(/\bid=["']([^"']+)["']/g)) found.add(match[1]);
  for (const match of markdown.matchAll(/^#{1,6}\s+(.+)$/gm)) {
    const base = match[1].trim().toLowerCase().replace(/<[^>]*>/g, '')
      .replace(/[^\p{L}\p{N}\p{M}_\- ]/gu, '').replace(/ /g, '-');
    const count = repeats.get(base) ?? 0;
    found.add(base + (count ? '-' + count : ''));
    repeats.set(base, count + 1);
  }
  return found;
}

export function checkProjectGuidance(repositoryRoot) {
  const root = realpathSync(repositoryRoot);
  const errors = [];
  const read = (path) => {
    try { return readFileSync(resolve(root, path), 'utf8'); }
    catch { errors.push('Missing or unreadable file: ' + path); return ''; }
  };
  const json = (path) => {
    try { return JSON.parse(read(path)); }
    catch { errors.push('Invalid JSON: ' + path); return null; }
  };
  const checkLink = (source, raw) => {
    if (/^(https?:|mailto:)/i.test(raw)) return;
    let target;
    try { target = decodeURIComponent(raw); }
    catch { errors.push(source + ': malformed link ' + raw); return; }
    if (/^(?:[a-z][a-z\d+.-]*:|[\/\\])/i.test(target) || target.includes('\\')) {
      errors.push(source + ': absolute or unsupported local link ' + raw); return;
    }
    const [filePart, fragment] = target.split('#');
    const path = filePart.split('?')[0];
    const full = path ? resolve(root, dirname(source), path) : resolve(root, source);
    if (!inside(root, full)) {
      errors.push(source + ': repository escape ' + raw); return;
    }
    if (!existsSync(full)) {
      errors.push(source + ': broken link ' + raw); return;
    }
    if (!inside(root, realpathSync(full))) {
      errors.push(source + ': resolved repository escape ' + raw); return;
    }
    if (fragment && full.endsWith('.md') && !anchors(readFileSync(full, 'utf8')).has(fragment)) {
      errors.push(source + ': missing anchor ' + raw);
    }
  };
  const packageJson = json('package.json');
  const scripts = packageJson?.scripts ?? {};
  const rootText = read('AGENTS.md');
  if (Buffer.byteLength(rootText) > 4096 || lineCount(rootText) > 70) {
    errors.push('AGENTS.md exceeds 4096 bytes or 70 lines');
  }
  for (const path of taskDocuments) {
    if (!rootText.includes('](' + path + ')')) errors.push('Missing root task pointer: ' + path);
  }
  if (!rootText.includes('## Code Review Rules') || !rootText.includes('](CODING_STANDARDS.md)')) {
    errors.push('Missing concise Code Review Rules entry');
  }
  const builtins = new Set(['install', 'exec', 'add', 'remove', 'run', 'dlx']);
  for (const path of guidanceDocuments(root)) {
    const content = path === 'AGENTS.md' ? rootText : read(path);
    for (const match of content.matchAll(/\[[^\]\n]*\]\((?:<([^>\n]+)>|([^\s)]+))(?:\s+"[^"]*")?\)/g)) {
      checkLink(path, match[1] ?? match[2]);
    }
    for (const match of content.matchAll(/\bpnpm(?: run)? ([a-z][\w:-]*)/g)) {
      if (!builtins.has(match[1]) && !Object.hasOwn(scripts, match[1])) {
        errors.push(path + ': unknown pnpm command ' + match[1]);
      }
    }
  }
  const gate = 'node --test tests/project-guidance.test.mjs && node scripts/check-project-guidance.mjs';
  if (scripts['test:project-guidance'] !== gate ||
      !scripts.test?.split(' && ').includes('pnpm test:project-guidance')) {
    errors.push('Project guidance gate is missing from package scripts or root test');
  }
  if (!read('.github/workflows/ci.yml').includes('run: pnpm test:project-guidance')) {
    errors.push('Project guidance gate is missing from CI');
  }

  const manifestPath = 'docs/retrospectives/guidance-migration.json';
  const migration = json(manifestPath);
  if (migration) {
    if (migration.schemaVersion !== 1 || migration.rootBudget?.bytes !== 4096 ||
        migration.rootBudget?.lines !== 70) errors.push('Invalid migration schema or root budget');
    const archiveTexts = new Map();
    const archives = Array.isArray(migration.archives) ? migration.archives : [];
    if (archives.length !== 2 || new Set(archives.map((item) => item.id)).size !== 2 ||
        !archives.some((item) => item.id === 'root') || !archives.some((item) => item.id === 'codex')) {
      errors.push('Migration must retain root and codex archives');
    }
    for (const item of archives) {
      if (typeof item.path !== 'string') { errors.push('Invalid archive path'); continue; }
      checkLink(manifestPath, '../../' + item.path);
      const path = resolve(root, item.path);
      if (!inside(root, path) || !existsSync(path)) continue;
      const bytes = readFileSync(path);
      const content = bytes.toString('utf8');
      archiveTexts.set(item.id, content);
      if (sha256(bytes) !== item.sha256 || bytes.length !== item.bytes || lineCount(content) !== item.lines) {
        errors.push('Archive integrity mismatch: ' + item.path);
      }
    }
    const expected = new Map();
    (archiveTexts.get('root') ?? '').split(/\r?\n/).forEach((line, index) => {
      const number = /^#{1,6}\s+(\d+(?:\.\d+)*)(?:\.)?(?:\s|$)/.exec(line);
      const key = number?.[1] ?? (line === '# 最终原则' ? 'final-principle' :
        line.startsWith('## Phase3-E ') ? 'phase3-e' : null);
      if (key) expected.set(key, index + 1);
    });
    const sections = Array.isArray(migration.sections) ? migration.sections : [];
    if (!expected.size || sections.length !== expected.size ||
        new Set(sections.map((item) => item.key)).size !== sections.length) {
      errors.push('Migration section coverage is incomplete or duplicated');
    }
    for (const section of sections) {
      if (expected.get(section.key) !== section.line) errors.push('Migration source location mismatch: ' + section.key);
      if (!Array.isArray(section.targets) || !section.targets.length) {
        errors.push('Missing migration target: ' + section.key); continue;
      }
      for (const target of section.targets) {
        if (typeof target !== 'string' || !target.startsWith('docs/agents/')) {
          errors.push('Invalid migration target: ' + section.key); continue;
        }
        checkLink(manifestPath, '../../' + target);
      }
    }
    if (!Array.isArray(migration.codexCoverage) || !migration.codexCoverage.length) {
      errors.push('Missing codex coverage');
    } else for (const path of migration.codexCoverage) checkLink(manifestPath, '../../' + path);
  }

  const index = json('docs/retrospectives/sessions.json');
  if (index) {
    const sessions = Array.isArray(index.sessions) ? index.sessions : [];
    const byId = new Map(sessions.map((session) => [session.id, session]));
    const mains = sessions.filter((session) => session.kind === 'main');
    const children = sessions.filter((session) => session.kind === 'subagent');
    const selection = index.selection ?? {};
    if (index.schemaVersion !== 1 || !sessions.length || byId.size !== sessions.length) {
      errors.push('Session index is empty, invalid or has duplicate IDs');
    }
    if (selection.matchedSessions !== sessions.length || selection.mainSessions !== mains.length ||
        selection.subagentSessions !== children.length || mains.length + children.length !== sessions.length ||
        selection.engineeringMainSessions !== mains.filter((s) => s.engineeringEvidence !== 'NOT_OBSERVED').length) {
      errors.push('Session index counts disagree');
    }
    for (const session of sessions) {
      const path = session.sourcePath ?? '';
      if (!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/.test(session.id ?? '') ||
          !/^[a-f\d]{64}$/.test(session.indexedUtf8Sha256 ?? '') ||
          !Number.isInteger(session.indexedLines) || session.indexedLines < 1 ||
          !Array.isArray(session.parseErrors) || session.parseErrors.length ||
          !Array.isArray(session.finalRecordLines) ||
          session.finalRecordLines.some((line) => !Number.isInteger(line) || line < 1 || line > session.indexedLines)) {
        errors.push('Invalid session provenance: ' + session.id);
      }
      if (!/^(sessions|archived_sessions)[\/\\]/.test(path) || path.split(/[\/\\]/).includes('..') ||
          !path.endsWith(session.compressed ? '.jsonl.zst' : '.jsonl')) {
        errors.push('Invalid private source locator: ' + session.id);
      }
      const chain = new Set();
      let node = session;
      while (node?.parentId && !chain.has(node.id)) {
        chain.add(node.id);
        node = byId.get(node.parentId);
      }
      if (!node || node.parentId || node.kind !== 'main' || node.id !== session.rootId ||
          (session.kind === 'main' && session.parentId !== null)) {
        errors.push('Invalid session parent/root chain: ' + session.id);
      }
    }
  }
  return [...new Set(errors)];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const errors = checkProjectGuidance(root);
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else console.log('Project guidance passed: budgets, links, commands, migration integrity and session provenance.');
}
