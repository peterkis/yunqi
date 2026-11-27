// The oracle is a separate checkout, so a migration commit cannot silently move the baseline.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
function run(command, args, cwd = root) {
  let executable = command;
  let arguments_ = args;
  if (command === 'pnpm' && process.platform === 'win32') {
    const cli = process.env.npm_execpath;
    if (cli && /pnpm[^/\\]*\.(?:c?js|mjs)$/i.test(cli) && existsSync(cli)) {
      executable = process.execPath;
      arguments_ = [cli, ...args];
    } else {
      // The only command strings here are the two fixed pnpm build/install calls below.
      executable = process.env.ComSpec || 'cmd.exe';
      arguments_ = ['/d', '/c', 'pnpm.cmd', ...args];
    }
  }
  const child = spawnSync(executable, arguments_, { cwd, stdio: 'inherit' });
  if (child.error) throw child.error;
  if (child.status !== 0) process.exit(child.status ?? 1);
}
const vendorConfig = resolve(root, '.artifacts', 'native-vendor.toml');
const cargoFlags = existsSync(vendorConfig) ? ['--config', vendorConfig, '--offline'] : [];
const cargo = args => run('cargo', [...cargoFlags, ...args]);
const [action = 'verify', ...flags] = process.argv.slice(2).filter(arg => arg !== '--');
if (action === 'test') {
  for (const manifest of ['native/Cargo.toml','native-http/Cargo.toml']) {
    cargo(['test','--release','--locked','--manifest-path',manifest]);
  }
  process.exit(0);
}
if (action === 'serve') {
  cargo(['run','--release','--locked','--manifest-path','native-http/Cargo.toml']);
  process.exit(0);
}
if (!['verify','verify-http'].includes(action)) throw new Error('Use test, verify, verify-http or serve');
const { originalSha } = JSON.parse(readFileSync(new URL('./goldens.json', import.meta.url), 'utf8'));
if (!/^[0-9a-f]{40}$/.test(originalSha)) throw new Error('Invalid oracle commit');
const reference = resolve(root, '.artifacts', 'native-oracle', originalSha);
if (!existsSync(resolve(reference, '.git'))) {
  mkdirSync(dirname(reference), { recursive: true });
  if (spawnSync('git', ['cat-file', '-e', originalSha + '^{commit}'], { cwd:root }).status !== 0) {
    run('git', ['fetch','origin',originalSha]);
  }
  run('git',['worktree','add','--detach',reference,originalSha]);
}
const git = args => execFileSync('git',['-C',reference,...args], {encoding:'utf8'}).trim();
if (git(['rev-parse','HEAD']) !== originalSha || git(['status','--porcelain','--untracked-files=normal'])) {
  throw new Error('The verification checkout was modified: ' + reference);
}
run('pnpm',['install','--frozen-lockfile'],reference);
run('pnpm',['build:contract-source'],reference);
// Cargo resolves target directories and target triples. Use its reported artifact
// even if an older release binary exists in the default target directory.
function releaseBinary(manifest, name) {
  const args = [...cargoFlags, 'build', '--release', '--locked', '--manifest-path', manifest,
    '--bin', name, '--message-format=json-render-diagnostics'];
  const build = spawnSync('cargo', args, {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 32 * 1024 * 1024,
  });
  if (build.error) throw build.error;
  if (build.status !== 0) process.exit(build.status ?? 1);
  const messages = build.stdout.trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  const binary = messages.find(message => message.reason === 'compiler-artifact' &&
    message.target.name === name && message.target.kind.includes('bin') && message.executable);
  if (!binary) throw new Error('Cargo did not report an executable for ' + name);
  return binary.executable;
}
if (action === 'verify-http') {
  const binary = releaseBinary('native-http/Cargo.toml', 'yunqi-http');
  run(process.execPath, [resolve(root,'native-http/verification/http-parity.mjs'), reference, binary, ...flags]);
} else {
  const binary = releaseBinary('native/Cargo.toml', 'yunqi-probe');
  run(process.execPath, [resolve(root,'native/verification/differential.mjs'), reference, binary, ...flags]);
}
