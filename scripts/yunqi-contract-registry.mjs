import {
  readdirSync,
  readFileSync,
} from 'node:fs';
import { relative, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

function toGitPath(root, path) {
  return relative(root, path).replaceAll('\\', '/');
}

function runGit(root, args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

export function readHistoricalContractIds(
  repositoryRoot,
  registryPath,
) {
  const shallow = runGit(
    repositoryRoot,
    ['rev-parse', '--is-shallow-repository'],
  );
  if (shallow === 'true') {
    throw new Error(
      'Contract history validation requires a full Git history',
    );
  }

  const gitPath = toGitPath(repositoryRoot, registryPath);
  const history = runGit(
    repositoryRoot,
    ['log', '--all', '--format=%H', '--', gitPath],
  );
  const contractIds = new Set();

  for (const commit of history.split(/\r?\n/).filter(Boolean)) {
    let source;
    try {
      source = runGit(
        repositoryRoot,
        ['show', `${commit}:${gitPath}`],
      );
    } catch {
      continue;
    }

    const historicalRegistry = JSON.parse(source);
    if (!Array.isArray(historicalRegistry?.contractIds)) {
      throw new Error(
        `Historical contract registry is invalid at ${commit}`,
      );
    }
    for (const contractId of historicalRegistry.contractIds) {
      if (typeof contractId !== 'string' || contractId.length === 0) {
        throw new Error(
          `Historical contract registry is invalid at ${commit}`,
        );
      }
      contractIds.add(contractId);
    }
  }

  return [...contractIds].sort();
}

export function readContractBaselines(freezeDirectory) {
  return Object.fromEntries(
    readdirSync(freezeDirectory)
      .filter((filename) => filename.endsWith('.freeze.json'))
      .sort()
      .map((filename) => [
        filename,
        JSON.parse(
          readFileSync(resolve(freezeDirectory, filename), 'utf8'),
        ),
      ]),
  );
}

export function readHistoricalContractBaselines(
  repositoryRoot,
  freezeDirectory,
  contractIds,
) {
  const shallow = runGit(
    repositoryRoot,
    ['rev-parse', '--is-shallow-repository'],
  );
  if (shallow === 'true') {
    throw new Error(
      'Contract history validation requires a full Git history',
    );
  }

  const historicalBaselines = {};
  for (const contractId of contractIds) {
    const filename = `${contractId}.freeze.json`;
    const gitPath = toGitPath(
      repositoryRoot,
      resolve(freezeDirectory, filename),
    );
    const history = runGit(
      repositoryRoot,
      ['log', '--all', '--reverse', '--format=%H', '--', gitPath],
    );

    for (const commit of history.split(/\r?\n/).filter(Boolean)) {
      try {
        historicalBaselines[filename] = JSON.parse(
          runGit(
            repositoryRoot,
            ['show', `${commit}:${gitPath}`],
          ),
        );
        break;
      } catch {
        continue;
      }
    }
  }

  return historicalBaselines;
}
