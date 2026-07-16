import { readdir, readFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
);
const SKIPPED_DIRECTORIES = new Set([
  '.git',
  'coverage',
  'dist',
  'node_modules',
]);
const FRONTEND_SOURCE_EXTENSIONS = new Set([
  '.cjs',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.mts',
  '.ts',
  '.tsx',
]);
const REQUIRED_GOVERNANCE_MARKERS = [
  'BeijingStandardTime+08:00 Absolute Representation',
  'calendar_time_local varchar',
  'epoch_ms bigint',
  'offset char(6)',
  'calendar_time_standard varchar',
  'timestamp with time zone',
  'new Date(result.epochMilliseconds)',
];
const GOVERNANCE_DOCUMENTS = [
  'AGENTS.md',
  'docs/architecture/adr/ADR-001-fixed-beijing-time-semantics.md',
];
const DOMAIN_TIME_SOURCE =
  'packages/yunqi-domain/src/calendar/time.ts';
const FRONTEND_FRAMEWORK_DEPENDENCIES = new Set([
  'next',
  'react',
  'react-dom',
]);
const YUNQI_TIME_SIGNALS = [
  'epochMilliseconds',
  'calendarTimeStandard',
  'YunQiCalendarTimeDto',
  'BeijingStandardTime+08:00',
];
const FRONTEND_TIME_VIOLATIONS = [
  {
    api: 'Date API',
    pattern: /\bDate\b|['"]Date['"]/,
  },
  {
    api: 'Intl API',
    pattern: /\bIntl\b|['"]Intl['"]/,
  },
  {
    api: 'Temporal API',
    pattern: /\bTemporal\b|['"]Temporal['"]/,
  },
  {
    api: 'Locale/ISO conversion',
    pattern:
      /\b(?:toISOString|toLocaleString|toLocaleDateString|toLocaleTimeString|getTimezoneOffset)\b/,
  },
  {
    api: 'IANA business-time identifier',
    pattern: /Asia\/Shanghai/,
  },
];

function normalizePath(value) {
  return value.replaceAll('\\', '/');
}

function extensionOf(fileName) {
  const index = fileName.lastIndexOf('.');
  return index === -1 ? '' : fileName.slice(index);
}

async function collectFiles(directory, predicate) {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }

  const nested = await Promise.all(
    entries.map(async (entry) => {
      if (SKIPPED_DIRECTORIES.has(entry.name)) return [];
      const target = resolve(directory, entry.name);
      if (entry.isDirectory()) return collectFiles(target, predicate);
      return entry.isFile() && predicate(entry.name) ? [target] : [];
    }),
  );

  return nested.flat();
}

async function validateGovernanceDocuments(root) {
  const violations = [];

  for (const relativePath of GOVERNANCE_DOCUMENTS) {
    const file = resolve(root, relativePath);
    let source;

    try {
      source = await readFile(file, 'utf8');
    } catch (error) {
      if (error?.code === 'ENOENT') {
        violations.push(`${relativePath}: required governance document missing`);
        continue;
      }
      throw error;
    }

    for (const marker of REQUIRED_GOVERNANCE_MARKERS) {
      if (!source.includes(marker)) {
        violations.push(`${relativePath}: missing ${marker}`);
      }
    }
  }

  const domainFile = resolve(root, DOMAIN_TIME_SOURCE);
  let domainSource;

  try {
    domainSource = await readFile(domainFile, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      violations.push(`${DOMAIN_TIME_SOURCE}: required Domain time source missing`);
      return violations;
    }
    throw error;
  }

  if (
    !domainSource.includes(
      'BeijingStandardTime+08:00 Absolute Representation',
    )
  ) {
    violations.push(
      'YunQiInstant: missing BeijingStandardTime+08:00 Absolute Representation declaration',
    );
  }

  return violations;
}

function isFrontendManifest(manifest) {
  const dependencyGroups = [
    manifest.dependencies,
    manifest.devDependencies,
    manifest.peerDependencies,
  ];

  return dependencyGroups.some((dependencies) =>
    dependencies !== undefined &&
    Object.keys(dependencies).some((name) =>
      FRONTEND_FRAMEWORK_DEPENDENCIES.has(name),
    ),
  );
}

async function discoverFrontendPackageRoots(root) {
  const manifests = [];

  for (const directory of ['apps', 'packages']) {
    manifests.push(
      ...(await collectFiles(
        resolve(root, directory),
        (name) => name === 'package.json',
      )),
    );
  }

  const packageRoots = [];

  for (const manifestPath of manifests) {
    let manifest;

    try {
      manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    } catch (error) {
      throw new Error(
        `${normalizePath(relative(root, manifestPath))}: invalid package.json`,
        { cause: error },
      );
    }

    if (isFrontendManifest(manifest)) {
      packageRoots.push(dirname(manifestPath));
    }
  }

  return packageRoots;
}

async function findFrontendViolations(root) {
  const violations = [];
  const frontendRoots = await discoverFrontendPackageRoots(root);

  for (const packageRoot of frontendRoots) {
    const sourceFiles = await collectFiles(
      resolve(packageRoot, 'src'),
      (name) => FRONTEND_SOURCE_EXTENSIONS.has(extensionOf(name)),
    );

    for (const file of sourceFiles) {
      const source = await readFile(file, 'utf8');
      const consumesYunQiTime = YUNQI_TIME_SIGNALS.some((signal) =>
        source.includes(signal),
      );

      for (const { api, pattern } of FRONTEND_TIME_VIOLATIONS) {
        if (pattern.test(source)) {
          const label =
            api === 'IANA business-time identifier'
              ? api
              : consumesYunQiTime
                ? `${api} used with YunQi epochMilliseconds`
                : `${api} forbidden in React/Next workspace`;
          violations.push(
            `${normalizePath(relative(root, file))}: ${label}`,
          );
        }
      }
    }
  }

  return violations;
}

export async function findYunQiTimeGovernanceViolations(
  root = repositoryRoot,
) {
  return [
    ...(await validateGovernanceDocuments(root)),
    ...(await findFrontendViolations(root)),
  ];
}

function readRootArgument(argv) {
  const index = argv.indexOf('--root');
  if (index === -1) return repositoryRoot;
  const value = argv[index + 1];
  if (!value) throw new Error('--root requires a path');
  return resolve(value);
}

const violations = await findYunQiTimeGovernanceViolations(
  readRootArgument(process.argv.slice(2)),
);

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(violation);
  }
  process.exitCode = 1;
}
