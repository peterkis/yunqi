import { readdir, readFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
);
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
const SKIPPED_DIRECTORIES = new Set([
  'coverage',
  'dist',
  'node_modules',
]);
const PACKAGE_RULES = {
  'packages/yunqi-contracts': {
    allowedRuntimeDependencies: new Set(),
    allowedSourceImports: new Set(),
  },
  'packages/yunqi-client': {
    allowedRuntimeDependencies: new Set(['@yunqi/contracts']),
    allowedSourceImports: new Set(['@yunqi/contracts']),
  },
};
const SERVICE_FORBIDDEN = new Set([
  '@yunqi/contracts',
  '@yunqi/client',
]);

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

  const nested = await Promise.all(
    entries.map(async (entry) => {
      if (SKIPPED_DIRECTORIES.has(entry.name)) return [];
      const target = resolve(directory, entry.name);
      if (entry.isDirectory()) return collectSourceFiles(target);
      if (
        entry.isFile() &&
        SOURCE_EXTENSIONS.has(extensionOf(entry.name))
      ) {
        return [target];
      }
      return [];
    }),
  );

  return nested.flat();
}

function collectRuntimeDependencyNames(manifest) {
  return [
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.optionalDependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ];
}

function collectBareImports(source) {
  const imports = new Set();
  const patterns = [
    /\bfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]/g,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      if (
        specifier !== undefined &&
        !specifier.startsWith('.') &&
        !specifier.startsWith('/')
      ) {
        imports.add(specifier);
      }
    }
  }

  return [...imports];
}

async function validatePackage(root, packagePath, rule) {
  const violations = [];
  const packageRoot = resolve(root, packagePath);
  const manifestPath = resolve(packageRoot, 'package.json');
  let manifest;

  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [`${packagePath}/package.json: required package missing`];
    }
    throw error;
  }

  for (const dependency of collectRuntimeDependencyNames(manifest)) {
    if (!rule.allowedRuntimeDependencies.has(dependency)) {
      violations.push(
        `${packagePath}/package.json: forbidden runtime dependency ${dependency}`,
      );
    }
  }

  for (const file of await collectSourceFiles(resolve(packageRoot, 'src'))) {
    const source = await readFile(file, 'utf8');
    for (const dependency of collectBareImports(source)) {
      if (!rule.allowedSourceImports.has(dependency)) {
        violations.push(
          `${normalizePath(relative(root, file))}: forbidden import ${dependency}`,
        );
      }
    }
  }

  return violations;
}

async function validateServiceDirection(root) {
  const packagePath = 'packages/yunqi-service';
  const packageRoot = resolve(root, packagePath);
  const violations = [];
  let manifest;

  try {
    manifest = JSON.parse(
      await readFile(resolve(packageRoot, 'package.json'), 'utf8'),
    );
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [`${packagePath}/package.json: required package missing`];
    }
    throw error;
  }

  for (const dependency of collectRuntimeDependencyNames(manifest)) {
    if (SERVICE_FORBIDDEN.has(dependency)) {
      violations.push(
        `${packagePath}/package.json: forbidden reverse dependency ${dependency}`,
      );
    }
  }

  for (const file of await collectSourceFiles(resolve(packageRoot, 'src'))) {
    const source = await readFile(file, 'utf8');
    for (const dependency of collectBareImports(source)) {
      if (SERVICE_FORBIDDEN.has(dependency)) {
        violations.push(
          `${normalizePath(relative(root, file))}: forbidden reverse import ${dependency}`,
        );
      }
    }
  }

  return violations;
}

export async function findContractDependencyViolations(
  root = repositoryRoot,
) {
  const groups = await Promise.all([
    ...Object.entries(PACKAGE_RULES).map(([packagePath, rule]) =>
      validatePackage(root, packagePath, rule),
    ),
    validateServiceDirection(root),
  ]);

  return groups.flat().sort((left, right) => left.localeCompare(right));
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : '';

if (invokedPath === import.meta.url) {
  const violations = await findContractDependencyViolations();
  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(violation);
    }
    process.exitCode = 1;
  }
}
