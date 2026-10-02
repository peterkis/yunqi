import { readdir, readFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep, win32 } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import { findComputedCapabilityViolations } from './governed-capabilities.mjs';

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
const REVERSE_FORBIDDEN = new Set([
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

function collectImports(source, fileName) {
  const imports = new Set();
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const addLiteral = (node) => {
    if (node && ts.isStringLiteralLike(node)) imports.add(node.text);
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      addLiteral(node.moduleSpecifier);
    } else if (ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
         (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      addLiteral(node.arguments[0]);
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      addLiteral(node.moduleReference.expression);
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      addLiteral(node.argument.literal);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return [...imports];
}

function isInside(parent, target) {
  const path = relative(parent, target);
  return path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

function isRelativeImport(specifier) {
  return specifier === '.' || specifier === '..' ||
    specifier.startsWith('./') || specifier.startsWith('../');
}

function isAbsoluteImport(specifier) {
  return specifier.startsWith('file:') || isAbsolute(specifier) ||
    win32.isAbsolute(specifier);
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
    for (const violation of findComputedCapabilityViolations(source, file)) {
      violations.push(`${normalizePath(relative(root, file))}: ${violation}`);
    }
    for (const dependency of collectImports(source, file)) {
      const specifier = normalizePath(dependency);
      const allowed = isRelativeImport(specifier)
        ? isInside(packageRoot, resolve(dirname(file), specifier))
        : !isAbsoluteImport(specifier) && rule.allowedSourceImports.has(specifier);
      if (!allowed) {
        violations.push(
          `${normalizePath(relative(root, file))}: forbidden import ${dependency}`,
        );
      }
    }
  }

  return violations;
}

function isReverseImport(root, file, dependency) {
  if (/^@yunqi\/(?:contracts|client)(?:\/|$)/.test(dependency)) return true;
  const specifier = normalizePath(dependency);
  if (!isRelativeImport(specifier) && !isAbsoluteImport(specifier)) return false;
  let target;
  try {
    target = specifier.startsWith('file:')
      ? fileURLToPath(specifier)
      : resolve(dirname(file), specifier);
  } catch {
    return true;
  }
  return ['packages/yunqi-contracts', 'packages/yunqi-client'].some(
    (packagePath) => isInside(resolve(root, packagePath), target),
  );
}

async function reversePackagePaths(root) {
  const paths = ['packages/yunqi-service', 'packages/yunqi-domain'];
  try {
    for (const entry of await readdir(resolve(root, 'packages/calendar-adapters'), { withFileTypes: true })) {
      if (entry.isDirectory() && !SKIPPED_DIRECTORIES.has(entry.name)) {
        paths.push(`packages/calendar-adapters/${entry.name}`);
      }
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  return paths;
}

async function validateReverseDirection(root, packagePath) {
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
    if (REVERSE_FORBIDDEN.has(dependency)) {
      violations.push(
        `${packagePath}/package.json: forbidden reverse dependency ${dependency}`,
      );
    }
  }

  for (const file of await collectSourceFiles(resolve(packageRoot, 'src'))) {
    const source = await readFile(file, 'utf8');
    for (const violation of findComputedCapabilityViolations(source, file)) {
      violations.push(`${normalizePath(relative(root, file))}: ${violation}`);
    }
    for (const dependency of collectImports(source, file)) {
      if (isReverseImport(root, file, dependency)) {
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
    ...(await reversePackagePaths(root)).map((packagePath) =>
      validateReverseDirection(root, packagePath),
    ),
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
