import hashlib
import json
import pathlib
import subprocess
import time

root = pathlib.Path(__file__).resolve().parents[2]
out = pathlib.Path(__file__).resolve().parent

def git(*args):
    return subprocess.check_output(['git', *args], cwd=root).decode().strip()

def hashes(paths):
    return {str(path.relative_to(root)).replace('\\', '/'): hashlib.sha256(path.read_bytes()).hexdigest()
            for path in sorted(paths) if path.is_file()}

all_files = git('ls-files', '-z', '--cached', '--others', '--exclude-standard').split('\0')
source = [root / path for path in all_files if path.startswith(('apps/', 'packages/', 'rules/', 'tests/', 'scripts/'))
          or path in ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'playwright.config.mjs', 'tsconfig.base.json']]
report = {'head': git('rev-parse', 'HEAD'), 'branch': git('branch', '--show-current'),
          'workingTreeBefore': git('status', '--porcelain'), 'sourceSha256': hashes(source),
          'node': subprocess.check_output(['node', '--version']).decode().strip(),
          'pnpm': subprocess.check_output(['pnpm', '--version']).decode().strip(), 'gates': []}
commands = [('test', ['pnpm', 'test']), ('typecheck', ['pnpm', 'typecheck']),
            ('coverage', ['pnpm', 'test:coverage']), ('contracts', ['pnpm', 'contracts:check']),
            ('schema', ['pnpm', 'schema:validate']), ('diff-check', ['git', 'diff', '--check'])]
for name, command in commands:
    start = time.time()
    print(f'START {name}', flush=True)
    log = out / f'linux-{name}.txt'
    with log.open('w') as handle:
        result = subprocess.run(command, cwd=root, stdout=handle, stderr=subprocess.STDOUT)
    entry = {'name': name, 'command': command, 'exitCode': result.returncode,
             'durationSeconds': round(time.time() - start, 3), 'log': log.name}
    report['gates'].append(entry)
    (out / 'linux-gates.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(entry), flush=True)
    if result.returncode:
        print(log.read_text()[-8000:], flush=True)
        break
report['buildSha256'] = hashes([path for package in [*root.glob('packages/*'), *root.glob('apps/*')]
                               for path in (package / 'dist').rglob('*')])
report['sourceUnchanged'] = report['sourceSha256'] == hashes(source)
report['remainingNotRun'] = [name for name, _ in commands[len(report['gates']):]]
(out / 'linux-gates.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
raise SystemExit(0 if len(report['gates']) == len(commands) and all(g['exitCode'] == 0 for g in report['gates']) else 1)
