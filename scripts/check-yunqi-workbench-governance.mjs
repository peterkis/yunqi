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
import * as ts from 'typescript';

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

function clauseHasRuntimeBinding(clause) {
  const normalized = clause.trim();
  if (normalized.startsWith('type ')) return false;

  const namedBindings = normalized.match(/^\{([\s\S]*)\}$/);
  if (!namedBindings) return true;
  if (namedBindings[1].trim() === '') return true;

  return namedBindings[1]
    .split(',')
    .filter((entry) => entry.trim() !== '')
    .some((entry) => !entry.trim().startsWith('type '));
}

function importEntries(source) {
  const entries = [];
  const staticImports =
    /\b(?:import|export)\s+([^'";]+?)\s+from\s+['"]([^'"]+)['"]/g;
  const sideEffectImports =
    /\bimport\s*['"]([^'"]+)['"]/g;
  const runtimeCalls = [
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const match of source.matchAll(staticImports)) {
    entries.push({
      runtime: clauseHasRuntimeBinding(match[1]),
      specifier: match[2],
    });
  }
  for (const match of source.matchAll(sideEffectImports)) {
    entries.push({ runtime: true, specifier: match[1] });
  }
  for (const pattern of runtimeCalls) {
    for (const match of source.matchAll(pattern)) {
      entries.push({ runtime: true, specifier: match[1] });
    }
  }

  return entries;
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

function packageRoot(specifier) {
  const segments = specifier.split('/');
  return specifier.startsWith('@')
    ? segments.slice(0, 2).join('/')
    : segments[0];
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
  const reExports =
    /\bexport\s+([^'";]+?)\s+from\s+['"](@yunqi\/client(?:\/[^'"]*)?)['"]/g;

  for (const match of source.matchAll(staticImports)) {
    if (clauseHasRuntimeBinding(match[1])) return true;
  }

  for (const match of source.matchAll(reExports)) {
    if (clauseHasRuntimeBinding(match[1])) return true;
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

function hasContractDtoImport(source) {
  const sourceFile = ts.createSourceFile(
    'workbench-source.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let found = false;

  const isContractsSpecifier = (node) =>
    ts.isStringLiteral(node) &&
    /^@yunqi\/contracts(?:\/|$)/.test(node.text);
  const isDtoName = (node) => {
    if (node === undefined) return false;
    if (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) {
      return /Dto$/.test(node.text);
    }
    if (
      ts.isImportSpecifier(node) ||
      ts.isExportSpecifier(node)
    ) {
      return (
        isDtoName(node.propertyName) ||
        isDtoName(node.name)
      );
    }
    if (ts.isQualifiedName(node)) {
      return isDtoName(node.left) || isDtoName(node.right);
    }
    if (ts.isLiteralTypeNode(node)) {
      return isDtoName(node.literal);
    }

    return false;
  };
  const parentIndexedTypeHasDtoName = (node) => {
    let current = node;
    let parent = node.parent;

    while (ts.isParenthesizedTypeNode(parent)) {
      current = parent;
      parent = parent.parent;
    }

    return (
      ts.isIndexedAccessTypeNode(parent) &&
      parent.objectType === current &&
      isDtoName(parent.indexType)
    );
  };

  const visit = (node) => {
    if (found) return;

    if (
      (ts.isImportDeclaration(node) ||
        ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      isContractsSpecifier(node.moduleSpecifier)
    ) {
      const bindings = ts.isImportDeclaration(node)
        ? node.importClause?.namedBindings
        : node.exportClause;
      const defaultBinding = ts.isImportDeclaration(node)
        ? node.importClause?.name
        : undefined;

      if (
        isDtoName(defaultBinding) ||
        (bindings !== undefined &&
          (ts.isNamespaceImport(bindings) ||
            ts.isNamespaceExport(bindings) ||
            (ts.isNamedImports(bindings) &&
              bindings.elements.some((element) =>
                isDtoName(element),
              )) ||
            (ts.isNamedExports(bindings) &&
              bindings.elements.some((element) =>
                isDtoName(element),
              ))))
      ) {
        found = true;
        return;
      }

      if (
        ts.isExportDeclaration(node) &&
        node.exportClause === undefined
      ) {
        found = true;
        return;
      }
    }

    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      isContractsSpecifier(node.argument.literal) &&
      (isDtoName(node.qualifier) ||
        parentIndexedTypeHasDtoName(node))
    ) {
      found = true;
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return found;
}

function hasDirectClientMethodAccess(source) {
  const sourceFile = ts.createSourceFile(
    'workbench-source.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const clientMethods = new Set([
    'calculate',
    'getCurrent',
    'getYear',
  ]);
  let found = false;

  const staticStringValue = (node) => {
    if (ts.isStringLiteralLike(node)) return node.text;
    if (ts.isParenthesizedExpression(node)) {
      return staticStringValue(node.expression);
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.PlusToken
    ) {
      const left = staticStringValue(node.left);
      const right = staticStringValue(node.right);
      return left === undefined || right === undefined
        ? undefined
        : left + right;
    }
    if (ts.isTemplateExpression(node)) {
      let value = node.head.text;

      for (const span of node.templateSpans) {
        const expression = staticStringValue(span.expression);
        if (expression === undefined) return undefined;
        value += expression + span.literal.text;
      }

      return value;
    }

    return undefined;
  };

  const isClientMethodName = (node) => {
    if (node === undefined) return false;
    if (ts.isComputedPropertyName(node)) {
      return isClientMethodName(node.expression);
    }
    if (ts.isParenthesizedExpression(node)) {
      return isClientMethodName(node.expression);
    }
    if (ts.isIdentifier(node)) {
      return clientMethods.has(node.text);
    }

    const value = staticStringValue(node);
    return value !== undefined && clientMethods.has(value);
  };

  const bindingPatternContainsClientMethod = (pattern) => {
    if (!ts.isObjectBindingPattern(pattern)) return false;

    return pattern.elements.some((element) => {
      if (
        isClientMethodName(element.propertyName) ||
        (ts.isIdentifier(element.name) &&
          isClientMethodName(element.name))
      ) {
        return true;
      }

      return bindingPatternContainsClientMethod(element.name);
    });
  };

  const visit = (node) => {
    if (found) return;

    if (
      (ts.isPropertyAccessExpression(node) &&
        isClientMethodName(node.name)) ||
      (ts.isElementAccessExpression(node) &&
        node.argumentExpression !== undefined &&
        isClientMethodName(node.argumentExpression)) ||
      ((ts.isVariableDeclaration(node) ||
        ts.isParameter(node)) &&
        bindingPatternContainsClientMethod(node.name))
    ) {
      found = true;
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return found;
}

function isProductionSource(fileName) {
  const normalized = normalizePath(fileName);
  return !(
    /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(normalized) ||
    normalized.includes('/src/test/')
  );
}

function isProductionComponentSource(fileName) {
  const normalized = normalizePath(fileName);
  const hasComponentResponsibility =
    normalized.includes('/src/components/') ||
    normalized.includes('/src/app/') ||
    (
      normalized.includes('/src/features/') &&
      normalized.includes('/components/')
    );

  return (
    isProductionSource(fileName) &&
    hasComponentResponsibility
  );
}

function isProductionPresentationMapperSource(fileName) {
  const normalized = normalizePath(fileName);
  return (
    isProductionSource(fileName) &&
    normalized.includes('/src/features/yunqi/presentation/')
  );
}

async function findIndexViolations(root) {
  const relativeIndex = `${WORKBENCH_ROOT}/index.html`;
  let source;

  try {
    source = await readFile(resolve(root, relativeIndex), 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }

  const htmlTag = source.match(/<html\b[^>]*>/i)?.[0];
  const language = htmlTag?.match(
    /\blang\s*=\s*(['"])([^'"]+)\1/i,
  )?.[2];

  return language === 'zh-CN'
    ? []
    : [`${relativeIndex}: document language must be zh-CN`];
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

    const imports = importEntries(source);
    for (const { specifier } of imports) {
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

    if (isProductionSource(file)) {
      for (const { runtime, specifier } of imports) {
        if (
          runtime &&
          !isRelativeImport(specifier) &&
          !isAbsoluteLocalImport(specifier) &&
          !ALLOWED_RUNTIME_DEPENDENCIES.has(packageRoot(specifier))
        ) {
          violations.push(
            `${relativePath}: runtime import ${specifier} is not in the Workbench allowlist`,
          );
        }
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

    if (isProductionPresentationMapperSource(file)) {
      for (const { specifier } of imports) {
        if (/^react(?:\/|$)|^react-dom(?:\/|$)/.test(specifier)) {
          violations.push(
            `${relativePath}: React imports are forbidden in presentation mapper source`,
          );
        }
        if (/^@tanstack\/react-query(?:\/|$)/.test(specifier)) {
          violations.push(
            `${relativePath}: TanStack Query imports are forbidden in presentation mapper source`,
          );
        }
        if (/^@yunqi\/client(?:\/|$)/.test(specifier)) {
          violations.push(
            `${relativePath}: @yunqi/client imports are forbidden in presentation mapper source`,
          );
        }
      }
      if (hasDirectClientMethodAccess(source)) {
        violations.push(
          `${relativePath}: client method access is forbidden in presentation mapper source`,
        );
      }
      if (/\bfetch\s*\(/.test(source)) {
        violations.push(
          `${relativePath}: fetch is forbidden in presentation mapper source`,
        );
      }
    }

    if (!isProductionComponentSource(file)) continue;

    if (hasContractDtoImport(source)) {
      violations.push(
        `${relativePath}: frozen DTO imports from @yunqi/contracts are forbidden in component source`,
      );
    }
    if (hasRuntimeClientImport(source)) {
      violations.push(
        `${relativePath}: runtime @yunqi/client import/re-export is forbidden in component source`,
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
    ...(await findIndexViolations(root)),
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
