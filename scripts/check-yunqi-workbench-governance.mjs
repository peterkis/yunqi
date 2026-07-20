import { readdir, readFile } from 'node:fs/promises';
import {
  dirname,
  isAbsolute,
  posix,
  relative,
  resolve,
  sep,
  win32,
} from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
);
const WORKBENCH_ROOT = 'apps/yunqi-workbench';
const SKIPPED_DIRECTORIES = new Set([
  'coverage',
  'dist',
  'node_modules',
]);
const SOURCE_EXTENSIONS = new Set([
  '.cjs',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.mts',
  '.ts',
  '.tsx',
]);
const ALLOWED_RUNTIME_DEPENDENCIES = new Set([
  '@tanstack/react-query',
  '@yunqi/client',
  '@yunqi/contracts',
  'react',
  'react-dom',
]);
const FORBIDDEN_IMPORTS = [
  {
    label: '@yunqi/service',
    pattern: /^@yunqi\/service(?:\/|$)/,
  },
  {
    label: '@yunqi/domain',
    pattern: /^@yunqi\/domain(?:\/|$)/,
  },
  {
    label: 'YunQi calendar adapter',
    pattern: /^@yunqi\/calendar-adapter(?:-|\/|$)/,
  },
  {
    label: 'internal generated OpenAPI module',
    pattern: /^@yunqi\/contracts\/.*(?:generated|openapi)/,
  },
  {
    label: 'Axios',
    pattern: /^axios(?:\/|$)/,
  },
  {
    label: 'React Router',
    pattern: /^react-router-dom(?:\/|$)/,
  },
];

function normalizePath(value) {
  return value.replaceAll('\\', '/');
}

function extensionOf(fileName) {
  const index = fileName.lastIndexOf('.');
  return index === -1 ? '' : fileName.slice(index);
}

async function collectSourceFiles(directory) {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }

  const files = [];

  for (const entry of entries) {
    if (SKIPPED_DIRECTORIES.has(entry.name)) continue;

    const target = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(target)));
    } else if (
      entry.isFile() &&
      SOURCE_EXTENSIONS.has(extensionOf(entry.name))
    ) {
      files.push(target);
    }
  }

  return files;
}

function importSpecifiers(source) {
  const specifiers = [];
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      specifiers.push(match[1]);
    }
  }

  return specifiers;
}

function isRelativeImport(specifier) {
  const normalized = normalizePath(specifier);
  return (
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('./') ||
    normalized.startsWith('../')
  );
}

function isAbsoluteLocalImport(specifier) {
  const normalized = normalizePath(specifier);
  return (
    normalized.startsWith('file:') ||
    isAbsolute(specifier) ||
    posix.isAbsolute(normalized) ||
    win32.isAbsolute(specifier)
  );
}

function escapesDirectory(parent, target) {
  const pathFromParent = relative(parent, target);
  return (
    pathFromParent === '..' ||
    pathFromParent.startsWith(`..${sep}`) ||
    isAbsolute(pathFromParent)
  );
}

function hasRuntimeClientImport(source) {
  const clientSpecifier = '@yunqi/client';
  const staticImports =
    /\bimport\s+([^'";]+?)\s+from\s+['"](@yunqi\/client(?:\/[^'"]*)?)['"]/g;

  for (const match of source.matchAll(staticImports)) {
    const clause = match[1].trim();
    if (clause.startsWith('type ')) continue;

    const namedImport = clause.match(/^\{([\s\S]*)\}$/);
    if (
      namedImport &&
      namedImport[1]
        .split(',')
        .filter((entry) => entry.trim() !== '')
        .every((entry) => entry.trim().startsWith('type '))
    ) {
      continue;
    }

    return true;
  }

  return (
    new RegExp(
      `\\bimport\\s*\\(\\s*['"]${clientSpecifier}(?:/[^'"]*)?['"]`,
    ).test(source) ||
    new RegExp(
      `\\brequire\\s*\\(\\s*['"]${clientSpecifier}(?:/[^'"]*)?['"]`,
    ).test(source) ||
    new RegExp(
      `\\bimport\\s*['"]${clientSpecifier}(?:/[^'"]*)?['"]`,
    ).test(source)
  );
}

function hasDirectClientMethodAccess(source) {
  const clientIdentifier =
    '(?:client|[A-Za-z_$][\\w$]*Client)';
  const method =
    '(?:getCurrent|getYear|calculate)';
  const propertyAccess = new RegExp(
    `(?:\\b[A-Za-z_$][\\w$]*|\\)|\\])\\s*(?:(?:\\?\\.|\\.)\\s*${method}\\b|(?:\\?\\.)?\\s*\\[\\s*['"]${method}['"]\\s*\\])`,
  );
  const destructuring = new RegExp(
    `\\b(?:const|let|var)\\s*\\{[^}\\r\\n]*\\b${method}\\b[^}\\r\\n]*\\}\\s*=\\s*${clientIdentifier}\\b`,
  );

  return propertyAccess.test(source) || destructuring.test(source);
}

function isProductionComponentSource(fileName) {
  const normalized = normalizePath(fileName);
  const isTestSource =
    /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(normalized) ||
    normalized.includes('/src/test/');
  const hasComponentResponsibility =
    normalized.includes('/src/components/') ||
    normalized.includes('/src/app/') ||
    (
      normalized.includes('/src/features/') &&
      normalized.includes('/components/')
    );

  return (
    !isTestSource &&
    hasComponentResponsibility
  );
}

async function findManifestViolations(root) {
  const relativeManifest = `${WORKBENCH_ROOT}/package.json`;
  const manifestPath = resolve(root, relativeManifest);
  let manifest;

  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [`${relativeManifest}: required Workbench manifest missing`];
    }
    return [`${relativeManifest}: invalid package.json`];
  }

  const violations = [];
  const runtimeGroups = [
    ['dependencies', manifest.dependencies],
    ['optionalDependencies', manifest.optionalDependencies],
    ['peerDependencies', manifest.peerDependencies],
  ];

  for (const [group, dependencies] of runtimeGroups) {
    for (const dependency of Object.keys(dependencies ?? {})) {
      if (!ALLOWED_RUNTIME_DEPENDENCIES.has(dependency)) {
        violations.push(
          `${relativeManifest}: runtime dependency ${dependency} is not allowed (${group})`,
        );
      }
    }
  }

  return violations;
}

async function findSourceViolations(root) {
  const workbenchRoot = resolve(root, WORKBENCH_ROOT);
  const sourceRoot = resolve(workbenchRoot, 'src');
  const sourceFiles = await collectSourceFiles(sourceRoot);
  const violations = [];

  for (const file of sourceFiles) {
    const source = await readFile(file, 'utf8');
    const relativePath = normalizePath(relative(root, file));

    for (const specifier of importSpecifiers(source)) {
      if (isAbsoluteLocalImport(specifier)) {
        violations.push(
          `${relativePath}: absolute local import ${specifier} is forbidden`,
        );
        continue;
      }
      if (
        isRelativeImport(specifier) &&
        escapesDirectory(
          workbenchRoot,
          resolve(dirname(file), normalizePath(specifier)),
        )
      ) {
        violations.push(
          `${relativePath}: relative import ${specifier} escapes apps/yunqi-workbench`,
        );
        continue;
      }

      const forbidden = FORBIDDEN_IMPORTS.find(({ pattern }) =>
        pattern.test(specifier),
      );
      if (forbidden) {
        violations.push(
          `${relativePath}: forbidden import ${specifier} (${forbidden.label})`,
        );
      }
    }

    const dtoDeclarationPatterns = [
      /^\s*(?:(?:export|default|declare|abstract)\s+)*(?:interface|class)\s+(YunQi[A-Za-z0-9_]*Dto)\b[^{\r\n]*\{/gm,
      /^\s*(?:(?:export|default|declare)\s+)*type\s+(YunQi[A-Za-z0-9_]*Dto)\b[^=\r\n]*=/gm,
    ];
    for (const pattern of dtoDeclarationPatterns) {
      for (const match of source.matchAll(pattern)) {
        violations.push(
          `${relativePath}: frozen DTO ${match[1]} must be imported from @yunqi/contracts`,
        );
      }
    }

    if (!isProductionComponentSource(file)) continue;

    if (hasRuntimeClientImport(source)) {
      violations.push(
        `${relativePath}: runtime @yunqi/client import is forbidden in component source`,
      );
    }
    if (/\bfetch\s*\(/.test(source)) {
      violations.push(`${relativePath}: direct fetch is forbidden`);
    }
    if (/\/api\/v1\/yunqi\b/.test(source)) {
      violations.push(`${relativePath}: direct YunQi API path is forbidden`);
    }
    if (hasDirectClientMethodAccess(source)) {
      violations.push(
        `${relativePath}: direct YunQi client method access is forbidden`,
      );
    }
  }

  return violations;
}

export async function findWorkbenchGovernanceViolations(
  root = repositoryRoot,
) {
  return [
    ...(await findManifestViolations(root)),
    ...(await findSourceViolations(root)),
  ];
}

function readRootArgument(argv) {
  const index = argv.indexOf('--root');
  if (index === -1) return repositoryRoot;
  const value = argv[index + 1];
  if (!value) throw new Error('--root requires a path');
  return resolve(value);
}

async function runCli() {
  const violations = await findWorkbenchGovernanceViolations(
    readRootArgument(process.argv.slice(2)),
  );

  for (const violation of violations) {
    console.error(violation);
  }
  if (violations.length > 0) process.exitCode = 1;
}

const isCli =
  process.argv[1] !== undefined &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isCli) {
  await runCli();
}
