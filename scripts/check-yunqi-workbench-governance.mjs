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
  'react-router-dom',
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

function parseWorkbenchSource(source, fileName) {
  const scriptKind = new Map([
    ['.cjs', ts.ScriptKind.JS],
    ['.cts', ts.ScriptKind.TS],
    ['.js', ts.ScriptKind.JS],
    ['.jsx', ts.ScriptKind.JSX],
    ['.mjs', ts.ScriptKind.JS],
    ['.mts', ts.ScriptKind.TS],
    ['.ts', ts.ScriptKind.TS],
    ['.tsx', ts.ScriptKind.TSX],
  ]).get(extensionOf(fileName)) ?? ts.ScriptKind.Unknown;

  return ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
}

function hasContractDtoImport(sourceFile) {
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

function hasDirectClientMethodAccess(sourceFile) {
  const clientMethods = new Set([
    'calculate',
    'getCurrent',
    'getYear',
  ]);
  let found = false;

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

function annualStageRailUsesCanonicalTimeline(sourceFile) {
  let localTimelineType;

  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== '../presentation/view-model' ||
      !statement.importClause?.namedBindings ||
      !ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      continue;
    }

    const timelineImport = statement.importClause.namedBindings.elements.find(
      (element) =>
        (element.propertyName?.text ?? element.name.text) ===
        'CurrentSixQiStageTuple',
    );
    if (timelineImport) localTimelineType = timelineImport.name.text;
  }

  if (!localTimelineType) return false;

  const props = sourceFile.statements.find(
    (statement) =>
      ts.isInterfaceDeclaration(statement) &&
      statement.name.text === 'AnnualStageRailProps',
  );
  if (!props || !ts.isInterfaceDeclaration(props)) return false;

  const steps = props.members.find(
    (member) =>
      ts.isPropertySignature(member) &&
      member.name !== undefined &&
      ((ts.isIdentifier(member.name) && member.name.text === 'steps') ||
        (ts.isStringLiteralLike(member.name) && member.name.text === 'steps')),
  );

  return Boolean(
    steps &&
      ts.isPropertySignature(steps) &&
      steps.type &&
      ts.isTypeReferenceNode(steps.type) &&
      ts.isIdentifier(steps.type.typeName) &&
      steps.type.typeName.text === localTimelineType,
  );
}

function unwrapExpression(node) {
  let current = node;

  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }

  return current;
}

function staticStringValue(node) {
  const current = unwrapExpression(node);

  if (ts.isStringLiteralLike(current)) return current.text;
  if (
    ts.isBinaryExpression(current) &&
    current.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    const left = staticStringValue(current.left);
    const right = staticStringValue(current.right);
    return left === undefined || right === undefined
      ? undefined
      : left + right;
  }
  if (ts.isTemplateExpression(current)) {
    let value = current.head.text;
    for (const span of current.templateSpans) {
      const expression = staticStringValue(span.expression);
      if (expression === undefined) return undefined;
      value += expression + span.literal.text;
    }
    return value;
  }

  return undefined;
}

function isOne(node) {
  const current = unwrapExpression(node);
  return ts.isNumericLiteral(current) && current.text === '1';
}

function staticMemberName(node) {
  const current = unwrapExpression(node);
  if (ts.isPropertyAccessExpression(current)) {
    return current.name.text;
  }
  if (ts.isElementAccessExpression(current)) {
    return staticStringValue(current.argumentExpression);
  }
  return undefined;
}

function isMapCall(node) {
  const expression = ts.isCallExpression(node)
    ? unwrapExpression(node.expression)
    : undefined;
  return Boolean(
    expression &&
      (ts.isPropertyAccessExpression(expression) ||
        ts.isElementAccessExpression(expression)) &&
      staticMemberName(expression) === 'map',
  );
}

function topLevelFunctionDeclaration(sourceFile, name) {
  return sourceFile.statements.find(
    (statement) =>
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text === name,
  );
}

function directMapCallback(expression) {
  const current = unwrapExpression(expression);
  if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
    return current;
  }
  return undefined;
}

function canonicalStageMapCallback(expression) {
  const current = unwrapExpression(expression);
  const parameter = current.parameters?.[0];
  if (
    ts.isArrowFunction(current) &&
    current.parameters.length === 1 &&
    parameter &&
    ts.isIdentifier(parameter.name) &&
    parameter.dotDotDotToken === undefined &&
    parameter.initializer === undefined
  ) {
    return current;
  }
  return undefined;
}

function isFunctionBoundary(node) {
  return (
    ts.isArrowFunction(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isConstructorDeclaration(node)
  );
}

function isStageMapCall(node) {
  if (!isMapCall(node)) return false;
  const access = unwrapExpression(node.expression);
  const receiver = unwrapExpression(access.expression);
  const collectionName = ts.isIdentifier(receiver)
    ? receiver.text
    : ts.isPropertyAccessExpression(receiver) ||
        ts.isElementAccessExpression(receiver)
      ? staticMemberName(receiver)
      : undefined;
  if (collectionName !== 'stages' && collectionName !== 'steps') {
    return false;
  }
  return true;
}

function stageMapCallback(node) {
  return isStageMapCall(node)
    ? directMapCallback(node.arguments[0])
    : undefined;
}

function containsPlusOne(node, identifier) {
  let found = false;
  const visit = (current) => {
    if (found) return;
    if (
      ts.isBinaryExpression(current) &&
      current.operatorToken.kind === ts.SyntaxKind.PlusToken &&
      ((isOne(current.left) &&
        (!identifier || isDirectIdentifier(current.right, identifier))) ||
        (isOne(current.right) &&
          (!identifier || isDirectIdentifier(current.left, identifier))))
    ) {
      found = true;
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return found;
}

function hasStageMapPlusOne(sourceFile, positionOnly) {
  let found = false;
  const visit = (node) => {
    if (found) return;
    const callback = ts.isCallExpression(node)
      ? stageMapCallback(node)
      : undefined;
    const position = callback?.parameters[1]?.name;
    const positionName =
      positionOnly && position && ts.isIdentifier(position)
        ? position.text
        : undefined;
    if (
      callback?.body &&
      (!positionOnly || positionName !== undefined) &&
      containsPlusOne(callback.body, positionName)
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

function hasNonInlineStageMapCallback(sourceFile) {
  let found = false;
  const visit = (node) => {
    if (found) return;
    if (
      ts.isCallExpression(node) &&
      isStageMapCall(node) &&
      canonicalStageMapCallback(node.arguments[0]) === undefined
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

function hasSelectedStepIndexMinusOne(sourceFile) {
  let found = false;
  const visit = (node) => {
    if (found) return;
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.MinusToken &&
      isDirectIdentifier(node.left, 'selectedStepIndex') &&
      isOne(node.right)
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

function isAnnualStageRailSource(fileName) {
  return normalizePath(fileName).endsWith(
    '/src/features/yunqi/components/AnnualStageRail.tsx',
  );
}

function isAnnualAnalysisComponentSource(fileName) {
  const normalized = normalizePath(fileName);
  return (
    isProductionSource(fileName) &&
    normalized.includes(
      '/src/features/yunqi/year-analysis/components/',
    ) &&
    !/\.fixture\.[cm]?[jt]sx?$/.test(normalized) &&
    !normalized.includes('/fixtures/') &&
    !normalized.includes('/__fixtures__/') &&
    !normalized.includes('/__tests__/')
  );
}

function isYearSelectorSource(fileName) {
  return (
    isAnnualAnalysisComponentSource(fileName) &&
    normalizePath(fileName).endsWith(
      '/src/features/yunqi/year-analysis/components/YearSelector.tsx',
    )
  );
}

function isSharedYunQiMapperSource(fileName) {
  return (
    isProductionSource(fileName) &&
    normalizePath(fileName).endsWith(
      '/src/features/yunqi/presentation/map-yunqi-shared.ts',
    )
  );
}

function annualComponentSemanticViolations(sourceFile) {
  const forbiddenIdentifiers = new Set([
    'currentStep',
    'completed',
    'upcoming',
  ]);
  const forbiddenLiterals = [
    '当前',
    '已结束',
    '未开始',
    '吉凶',
    '诊断',
    '治疗',
  ];
  const forbiddenEnglishLiterals = [
    'current',
    'completed',
    'upcoming',
    'diagnosis',
    'treatment',
  ];
  const identifiers = new Set();
  const literals = new Set();

  const recordLiterals = (value) => {
    for (const literal of forbiddenLiterals) {
      if (value.includes(literal)) literals.add(literal);
    }
    const lowerValue = value.toLowerCase();
    for (const literal of forbiddenEnglishLiterals) {
      if (lowerValue.includes(literal)) literals.add(literal);
    }
  };
  const visit = (node) => {
    if (
      ts.isIdentifier(node) &&
      forbiddenIdentifiers.has(node.text)
    ) {
      identifiers.add(node.text);
    }
    if (ts.isJsxText(node)) {
      recordLiterals(node.text);
    }
    if (
      ts.isStringLiteralLike(node) ||
      ts.isTemplateExpression(node) ||
      (ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.PlusToken)
    ) {
      const staticValue = staticStringValue(node);
      if (staticValue !== undefined) recordLiterals(staticValue);
    }
    if (ts.isTemplateExpression(node)) {
      recordLiterals(node.head.text);
      for (const span of node.templateSpans) {
        recordLiterals(span.literal.text);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return [
    ...[...identifiers].map(
      (identifier) =>
        `annual component identifier ${identifier} is forbidden`,
    ),
    ...[...literals].map(
      (literal) =>
        `annual source-wide forbidden literal ${literal} is forbidden`,
    ),
  ];
}

function isDirectIdentifier(node, name) {
  const current = unwrapExpression(node);
  return ts.isIdentifier(current) && current.text === name;
}

function optionUsesCallbackItemDirectly(option, itemName) {
  const valueAttribute = option.openingElement.attributes.properties.find(
    (attribute) =>
      ts.isJsxAttribute(attribute) &&
      ts.isIdentifier(attribute.name) &&
      attribute.name.text === 'value',
  );
  const valueExpression =
    valueAttribute &&
    ts.isJsxAttribute(valueAttribute) &&
    valueAttribute.initializer &&
    ts.isJsxExpression(valueAttribute.initializer)
      ? valueAttribute.initializer.expression
      : undefined;
  const meaningfulChildren = option.children.filter(
    (child) => !(ts.isJsxText(child) && child.text.trim() === ''),
  );

  return (
    valueExpression !== undefined &&
    isDirectIdentifier(valueExpression, itemName) &&
    meaningfulChildren.length === 1 &&
    ts.isJsxExpression(meaningfulChildren[0]) &&
    meaningfulChildren[0].expression !== undefined &&
    isDirectIdentifier(meaningfulChildren[0].expression, itemName)
  );
}

function canonicalYearOptionMap(node) {
  const mapCall = unwrapExpression(node);
  if (
    !ts.isCallExpression(mapCall) ||
    mapCall.arguments.length !== 1 ||
    !ts.isPropertyAccessExpression(
      unwrapExpression(mapCall.expression),
    )
  ) {
    return false;
  }

  const access = unwrapExpression(mapCall.expression);
  if (
    access.name.text !== 'map' ||
    !isDirectIdentifier(access.expression, 'YUNQI_YEAR_OPTIONS')
  ) {
    return false;
  }

  const callback = unwrapExpression(mapCall.arguments[0]);
  const item = callback.parameters?.[0]?.name;
  if (
    !ts.isArrowFunction(callback) ||
    callback.parameters.length !== 1 ||
    !item ||
    !ts.isIdentifier(item)
  ) {
    return false;
  }

  const option = unwrapExpression(callback.body);
  return (
    ts.isJsxElement(option) &&
    ts.isIdentifier(option.openingElement.tagName) &&
    option.openingElement.tagName.text === 'option' &&
    optionUsesCallbackItemDirectly(option, item.text)
  );
}

function yearSelectorViolations(sourceFile) {
  const violations = [];
  let hasCanonicalImport = false;
  let consumesCanonicalImport = false;
  let hasCanonicalOptionMap = false;
  let hasNonCanonicalOptionMap = false;
  let shadowsCanonicalImport = false;
  let exportedReturnCount = 0;
  let returnedSelectCount = 0;
  let exportedYearSelector;
  const copiedBoundaries = new Set();

  for (const statement of sourceFile.statements) {
    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text === 'YearSelector' &&
      statement.modifiers?.some(
        (modifier) =>
          modifier.kind === ts.SyntaxKind.ExportKeyword,
      )
    ) {
      exportedYearSelector = statement;
    }
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text ===
        '../../../../lib/yunqi-year-range' &&
      !statement.importClause?.isTypeOnly &&
      statement.importClause?.namedBindings &&
      ts.isNamedImports(statement.importClause.namedBindings) &&
      statement.importClause.namedBindings.elements.some(
        (element) =>
          !element.isTypeOnly &&
          element.propertyName === undefined &&
          element.name.text === 'YUNQI_YEAR_OPTIONS',
      )
    ) {
      hasCanonicalImport = true;
    }
  }

  const visit = (node) => {
    if (
      ts.isNumericLiteral(node) &&
      (node.text === '1901' || node.text === '2099')
    ) {
      copiedBoundaries.add(node.text);
    }
    if (
      ts.isIdentifier(node) &&
      node.text === 'YUNQI_YEAR_OPTIONS' &&
      !ts.isImportSpecifier(node.parent)
    ) {
      consumesCanonicalImport = true;
      const parent = node.parent;
      if (
        (ts.isBindingElement(parent) && parent.name === node) ||
        ((ts.isParameter(parent) ||
          ts.isVariableDeclaration(parent) ||
          ts.isFunctionDeclaration(parent) ||
          ts.isFunctionExpression(parent) ||
          ts.isClassDeclaration(parent)) &&
          parent.name === node)
      ) {
        shadowsCanonicalImport = true;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  const visitReturned = (node) => {
    if (isFunctionBoundary(node)) {
      return;
    }
    if (
      ts.isJsxElement(node) &&
      ts.isIdentifier(node.openingElement.tagName) &&
      node.openingElement.tagName.text === 'select'
    ) {
      returnedSelectCount += 1;
      let selectHasCanonicalMap = false;
      for (const child of node.children) {
        if (
          !ts.isJsxExpression(child) ||
          child.expression === undefined
        ) {
          continue;
        }
        const expression = unwrapExpression(child.expression);
        const isDirectMap =
          ts.isCallExpression(expression) &&
          ts.isPropertyAccessExpression(
            unwrapExpression(expression.expression),
          ) &&
          unwrapExpression(expression.expression).name.text === 'map';
        if (!isDirectMap) {
          hasNonCanonicalOptionMap = true;
        } else {
          if (canonicalYearOptionMap(expression)) {
            selectHasCanonicalMap = true;
            hasCanonicalOptionMap = true;
          } else {
            hasNonCanonicalOptionMap = true;
          }
        }
      }
      if (!selectHasCanonicalMap) hasNonCanonicalOptionMap = true;
    }
    ts.forEachChild(node, visitReturned);
  };
  if (exportedYearSelector?.body) {
    const visitSelectorBody = (node) => {
      if (
        node !== exportedYearSelector.body &&
        isFunctionBoundary(node)
      ) {
        return;
      }
      if (ts.isReturnStatement(node) && node.expression) {
        exportedReturnCount += 1;
        visitReturned(unwrapExpression(node.expression));
        return;
      }
      if (ts.isReturnStatement(node)) {
        exportedReturnCount += 1;
        return;
      }
      ts.forEachChild(node, visitSelectorBody);
    };
    visitSelectorBody(exportedYearSelector.body);
  }

  if (!hasCanonicalImport) {
    violations.push(
      'must import YUNQI_YEAR_OPTIONS from lib/yunqi-year-range',
    );
  } else if (!consumesCanonicalImport) {
    violations.push('must consume imported YUNQI_YEAR_OPTIONS');
  } else if (
    !hasCanonicalOptionMap ||
    hasNonCanonicalOptionMap ||
    shadowsCanonicalImport ||
    exportedReturnCount !== 1 ||
    returnedSelectCount !== 1
  ) {
    violations.push(
      'exported YearSelector must have exactly one return with the canonical YUNQI_YEAR_OPTIONS option map',
    );
  }
  for (const boundary of copiedBoundaries) {
    violations.push(
      `duplicated YunQi year boundary ${boundary} is forbidden`,
    );
  }

  return violations;
}

function canonicalStageMapper(sourceFile) {
  const mapper = topLevelFunctionDeclaration(
    sourceFile,
    'mapSixQiStage',
  );
  if (
    !mapper?.body ||
    mapper.parameters.length !== 1 ||
    !ts.isIdentifier(mapper.parameters[0].name) ||
    mapper.parameters[0].name.text !== 'step' ||
    mapper.body.statements.length !== 1 ||
    !ts.isReturnStatement(mapper.body.statements[0]) ||
    mapper.body.statements[0].expression === undefined
  ) {
    return false;
  }

  const returned = unwrapExpression(
    mapper.body.statements[0].expression,
  );
  if (
    !ts.isObjectLiteralExpression(returned) ||
    returned.properties.some(
      (property) =>
        'name' in property &&
        property.name !== undefined &&
        ts.isComputedPropertyName(property.name),
    )
  ) {
    return false;
  }

  const indexProperties = returned.properties.filter(
    (property) =>
      'name' in property &&
      property.name !== undefined &&
      (ts.isIdentifier(property.name) ||
        ts.isStringLiteralLike(property.name)) &&
      property.name.text === 'index',
  );
  if (
    indexProperties.length !== 1 ||
    !ts.isPropertyAssignment(indexProperties[0]) ||
    !ts.isIdentifier(indexProperties[0].name)
  ) {
    return false;
  }

  const indexPosition = returned.properties.indexOf(indexProperties[0]);
  if (
    returned.properties
      .slice(indexPosition + 1)
      .some(ts.isSpreadAssignment)
  ) {
    return false;
  }

  const value = unwrapExpression(indexProperties[0].initializer);
  return (
    ts.isPropertyAccessExpression(value) &&
    isDirectIdentifier(value.expression, 'step') &&
    value.name.text === 'index'
  );
}

function canonicalTupleMapper(sourceFile) {
  const mapper = topLevelFunctionDeclaration(
    sourceFile,
    'mapSixQiStageTuple',
  );
  if (
    !mapper?.body ||
    mapper.parameters.length !== 1 ||
    !ts.isIdentifier(mapper.parameters[0].name) ||
    mapper.parameters[0].name.text !== 'steps' ||
    mapper.body.statements.length !== 2
  ) {
    return false;
  }

  const [declarationStatement, returnStatement] =
    mapper.body.statements;
  if (
    !ts.isVariableStatement(declarationStatement) ||
    !(declarationStatement.declarationList.flags & ts.NodeFlags.Const) ||
    declarationStatement.declarationList.declarations.length !== 1 ||
    !ts.isReturnStatement(returnStatement) ||
    returnStatement.expression === undefined
  ) {
    return false;
  }

  const declaration =
    declarationStatement.declarationList.declarations[0];
  if (
    !ts.isArrayBindingPattern(declaration.name) ||
    declaration.name.elements.length !== 6 ||
    !declaration.initializer ||
    !isDirectIdentifier(declaration.initializer, 'steps') ||
    declaration.name.elements.some(
      (element) =>
        ts.isOmittedExpression(element) ||
        !ts.isIdentifier(element.name) ||
        element.propertyName !== undefined ||
        element.initializer !== undefined ||
        element.dotDotDotToken !== undefined,
    )
  ) {
    return false;
  }

  const names = declaration.name.elements.map(
    (element) => element.name.text,
  );
  const returned = unwrapExpression(returnStatement.expression);
  return (
    ts.isArrayLiteralExpression(returned) &&
    returned.elements.length === 6 &&
    returned.elements.every((element, index) => {
      const call = unwrapExpression(element);
      return (
        ts.isCallExpression(call) &&
        isDirectIdentifier(call.expression, 'mapSixQiStage') &&
        call.arguments.length === 1 &&
        isDirectIdentifier(call.arguments[0], names[index])
      );
    })
  );
}

function sharedTupleMapperViolations(sourceFile) {
  const violations = [];
  if (!canonicalTupleMapper(sourceFile)) {
    violations.push(
      'mapSixQiStageTuple must use one six-item const destructure and six ordered direct mapSixQiStage calls',
    );
  }
  if (!canonicalStageMapper(sourceFile)) {
    violations.push(
      'mapSixQiStage must keep step.index as the final unique static index',
    );
  }
  return violations;
}

const INQUIRY_CONTEXT_MODEL_SPECS = new Map([
  [
    'audit-context.ts',
    {
      interfaceName: 'AuditContextModel',
      members: [
        ['actorId', 'string', false],
        ['action', 'string', false],
        ['timestamp', 'string', false],
        ['targetId', 'string', true],
      ],
    },
  ],
  [
    'inquiry-context.ts',
    {
      interfaceName: 'InquiryContextModel',
      members: [
        ['id', 'string', false],
        ['patientId', 'string', false],
      ],
    },
  ],
  [
    'observation-context.ts',
    {
      interfaceName: 'ObservationContextModel',
      members: [
        ['id', 'string', false],
        ['inquiryId', 'string', false],
        ['category', 'string', true],
        ['recordedValue', 'unknown', true],
      ],
    },
  ],
  [
    'patient-context.ts',
    {
      interfaceName: 'PatientContextModel',
      members: [
        ['id', 'string', false],
        ['displayName', 'string', true],
      ],
    },
  ],
  [
    'permission-context.ts',
    {
      interfaceName: 'PermissionContextModel',
      members: [['actorId', 'string', false]],
    },
  ],
]);

const INQUIRY_MODEL_INDEX_EXPORTS = [
  ['AuditContextModel', './audit-context'],
  ['InquiryContextModel', './inquiry-context'],
  ['ObservationContextModel', './observation-context'],
  ['PatientContextModel', './patient-context'],
  ['PermissionContextModel', './permission-context'],
];

const INQUIRY_VISIBLE_ATTRIBUTES = new Set([
  'alt',
  'aria-label',
  'description',
  'label',
  'placeholder',
  'title',
]);

const INQUIRY_FORBIDDEN_VISIBLE_LITERALS = [
  '诊断',
  '辨证',
  '证型',
  '治疗',
  '处方',
  '用药',
  '风险预测',
  '推荐方案',
  'diagnosis',
  'treatment',
  'prescription',
  'medication',
  'risk prediction',
  'recommendation',
];

function hasSyntaxModifier(node, kind) {
  return node.modifiers?.some((modifier) => modifier.kind === kind) ?? false;
}

function inquiryModelInterfaceMatches(sourceFile, spec) {
  if (sourceFile.statements.length !== 1) return false;
  const declaration = sourceFile.statements[0];
  if (
    !ts.isInterfaceDeclaration(declaration) ||
    declaration.name.text !== spec.interfaceName ||
    !hasSyntaxModifier(declaration, ts.SyntaxKind.ExportKeyword) ||
    declaration.typeParameters !== undefined ||
    declaration.heritageClauses !== undefined ||
    declaration.members.length !== spec.members.length
  ) {
    return false;
  }

  return declaration.members.every((member, index) => {
    const [name, type, optional] = spec.members[index];
    return (
      ts.isPropertySignature(member) &&
      ts.isIdentifier(member.name) &&
      member.name.text === name &&
      hasSyntaxModifier(member, ts.SyntaxKind.ReadonlyKeyword) &&
      Boolean(member.questionToken) === optional &&
      member.initializer === undefined &&
      member.type?.getText(sourceFile) === type
    );
  });
}

function inquiryModelIndexMatches(sourceFile) {
  if (sourceFile.statements.length !== INQUIRY_MODEL_INDEX_EXPORTS.length) {
    return false;
  }

  return sourceFile.statements.every((statement, index) => {
    const [name, moduleSpecifier] = INQUIRY_MODEL_INDEX_EXPORTS[index];
    return (
      ts.isExportDeclaration(statement) &&
      statement.isTypeOnly &&
      statement.moduleSpecifier !== undefined &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === moduleSpecifier &&
      statement.exportClause !== undefined &&
      ts.isNamedExports(statement.exportClause) &&
      statement.exportClause.elements.length === 1 &&
      statement.exportClause.elements[0].propertyName === undefined &&
      statement.exportClause.elements[0].name.text === name
    );
  });
}

function inquiryModelViolations(sourceFile, fileName) {
  const baseName = normalizePath(fileName).split('/').at(-1);
  if (baseName === 'index.ts') {
    return inquiryModelIndexMatches(sourceFile)
      ? []
      : [
          'inquiry model index must contain only the frozen type-only exports',
        ];
  }

  const spec = INQUIRY_CONTEXT_MODEL_SPECS.get(baseName);
  if (spec === undefined) {
    return ['only the five frozen Phase3-C4 Context Model modules are allowed'];
  }

  return inquiryModelInterfaceMatches(sourceFile, spec)
    ? []
    : [`${spec.interfaceName} must match the frozen Phase3-C4 interface`];
}

function hasInquiryContextModelImport(sourceFile) {
  return sourceFile.statements.some((statement) => {
    if (
      !ts.isImportDeclaration(statement) ||
      statement.importClause === undefined
    ) {
      return false;
    }
    const clause = statement.importClause;
    if (clause.name?.text.endsWith('ContextModel')) return true;
    const bindings = clause.namedBindings;
    if (bindings === undefined) return false;
    if (ts.isNamespaceImport(bindings)) return true;
    return bindings.elements.some(
      (element) =>
        element.name.text.endsWith('ContextModel') ||
        element.propertyName?.text.endsWith('ContextModel'),
    );
  });
}

function exportsInquiryContextModelFromFeatureRoot(sourceFile) {
  return sourceFile.statements.some((statement) => {
    if (!ts.isExportDeclaration(statement)) return false;
    if (
      ts.isStringLiteral(statement.moduleSpecifier) &&
      /^\.\/models(?:\/|$)/.test(statement.moduleSpecifier.text)
    ) {
      return true;
    }
    if (
      statement.exportClause === undefined ||
      !ts.isNamedExports(statement.exportClause)
    ) {
      return false;
    }
    return statement.exportClause.elements.some(
      (element) =>
        element.name.text.endsWith('ContextModel') ||
        element.propertyName?.text.endsWith('ContextModel'),
    );
  });
}

function inquiryForbiddenLiteral(value) {
  const normalized = value.toLocaleLowerCase('en-US');
  return INQUIRY_FORBIDDEN_VISIBLE_LITERALS.find((literal) =>
    normalized.includes(literal.toLocaleLowerCase('en-US')),
  );
}

function inquiryVisibleMedicalCopyViolations(sourceFile) {
  const violations = [];

  const inspectValue = (value) => {
    if (value === undefined) return;
    const literal = inquiryForbiddenLiteral(value);
    if (literal !== undefined) {
      violations.push(
        `inquiry user-visible medical-decision literal ${literal} is forbidden`,
      );
    }
  };

  const visit = (node) => {
    if (ts.isJsxText(node)) {
      inspectValue(node.text);
    } else if (
      ts.isJsxAttribute(node) &&
      ts.isIdentifier(node.name) &&
      INQUIRY_VISIBLE_ATTRIBUTES.has(node.name.text)
    ) {
      if (node.initializer !== undefined) {
        if (ts.isStringLiteral(node.initializer)) {
          inspectValue(node.initializer.text);
        } else if (
          ts.isJsxExpression(node.initializer) &&
          node.initializer.expression !== undefined
        ) {
          inspectValue(staticStringValue(node.initializer.expression));
        }
      }
    } else if (
      ts.isJsxExpression(node) &&
      node.expression !== undefined &&
      !ts.isJsxAttribute(node.parent)
    ) {
      inspectValue(staticStringValue(node.expression));
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return [...new Set(violations)];
}

function isProductionSource(fileName) {
  const normalized = normalizePath(fileName);
  return !(
    /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(normalized) ||
    normalized.includes('/src/test/') ||
    normalized.includes('/__tests__/')
  );
}

function isProductionComponentSource(fileName) {
  const normalized = normalizePath(fileName);
  const hasComponentResponsibility =
    normalized.includes('/src/components/') ||
    normalized.includes('/src/app/') ||
    (
      normalized.includes('/src/features/') &&
      (
        normalized.includes('/components/') ||
        normalized.includes('/pages/')
      )
    );

  return (
    isProductionSource(fileName) &&
    hasComponentResponsibility
  );
}

function isInquiryModelSource(fileName) {
  const normalized = normalizePath(fileName);
  return (
    isProductionSource(fileName) &&
    normalized.includes('/src/features/inquiry/models/')
  );
}

function isInquiryPresentationSource(fileName) {
  const normalized = normalizePath(fileName);
  return (
    isProductionSource(fileName) &&
    !/\.fixture\.[cm]?[jt]sx?$/.test(normalized) &&
    !normalized.includes('/fixtures/') &&
    normalized.includes('/src/features/inquiry/') &&
    (
      normalized.includes('/components/') ||
      normalized.includes('/pages/')
    )
  );
}

function isInquiryFeatureRootIndex(fileName) {
  return normalizePath(fileName).endsWith(
    '/src/features/inquiry/index.ts',
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
    const sourceFile = parseWorkbenchSource(source, file);
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

    if (isInquiryFeatureRootIndex(file)) {
      if (exportsInquiryContextModelFromFeatureRoot(sourceFile)) {
        violations.push(
          `${relativePath}: inquiry Context Models must not be exported from a feature-root barrel`,
        );
      }
    }

    if (isInquiryModelSource(file)) {
      for (const violation of inquiryModelViolations(sourceFile, file)) {
        violations.push(`${relativePath}: ${violation}`);
      }
    }

    if (isInquiryPresentationSource(file)) {
      if (hasInquiryContextModelImport(sourceFile)) {
        violations.push(
          `${relativePath}: inquiry Context Model imports are forbidden in Phase3-C4 presentation source`,
        );
      }
      for (const violation of inquiryVisibleMedicalCopyViolations(
        sourceFile,
      )) {
        violations.push(`${relativePath}: ${violation}`);
      }
    }

    if (isAnnualStageRailSource(file)) {
      if (!annualStageRailUsesCanonicalTimeline(sourceFile)) {
        violations.push(
          `${relativePath}: steps must consume CurrentSixQiStageTuple directly`,
        );
      }
      if (hasStageMapPlusOne(sourceFile, false)) {
        violations.push(
          `${relativePath}: stage ordinal arithmetic is forbidden`,
        );
      }
    }

    if (isAnnualAnalysisComponentSource(file)) {
      for (const violation of annualComponentSemanticViolations(
        sourceFile,
      )) {
        violations.push(`${relativePath}: ${violation}`);
      }
      if (hasNonInlineStageMapCallback(sourceFile)) {
        violations.push(
          `${relativePath}: annual stages/steps.map callback must be inline arrow with exactly one identifier parameter`,
        );
      }
      if (hasStageMapPlusOne(sourceFile, true)) {
        violations.push(
          `${relativePath}: annual stage index must preserve the API stage index`,
        );
      }
      if (
        hasSelectedStepIndexMinusOne(sourceFile)
      ) {
        violations.push(
          `${relativePath}: annual stage selection must match the API stage index`,
        );
      }
    }

    if (isYearSelectorSource(file)) {
      for (const violation of yearSelectorViolations(sourceFile)) {
        violations.push(`${relativePath}: ${violation}`);
      }
    }

    if (isSharedYunQiMapperSource(file)) {
      for (const violation of sharedTupleMapperViolations(
        sourceFile,
      )) {
        violations.push(`${relativePath}: ${violation}`);
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
        if (/^react-router-dom(?:\/|$)/.test(specifier)) {
          violations.push(
            `${relativePath}: React Router imports are forbidden in presentation mapper source`,
          );
        }
      }
      if (hasDirectClientMethodAccess(sourceFile)) {
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

    if (hasContractDtoImport(sourceFile)) {
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
    if (hasDirectClientMethodAccess(sourceFile)) {
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
