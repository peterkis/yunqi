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

function hasContractDtoImport(source, fileName) {
  const sourceFile = parseWorkbenchSource(source, fileName);
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

function hasDirectClientMethodAccess(source, fileName) {
  const sourceFile = parseWorkbenchSource(source, fileName);
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
      ts.isAsExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isTypeAssertionExpression(node)
    ) {
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

function annualStageRailUsesCanonicalTimeline(source, fileName) {
  const sourceFile = parseWorkbenchSource(source, fileName);
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

function staticPropertyName(node) {
  if (node === undefined) return undefined;
  const current = unwrapExpression(node);

  if (ts.isIdentifier(current) || ts.isStringLiteralLike(current)) {
    return current.text;
  }
  if (ts.isComputedPropertyName(current)) {
    return staticPropertyName(current.expression);
  }

  return undefined;
}

function memberName(expression) {
  const current = unwrapExpression(expression);

  if (ts.isIdentifier(current)) return current.text;
  if (ts.isPropertyAccessExpression(current)) return current.name.text;
  if (ts.isElementAccessExpression(current)) {
    return staticPropertyName(current.argumentExpression);
  }

  return undefined;
}

function expressionContainsIdentifier(node, names) {
  let found = false;

  const visit = (current) => {
    if (found) return;
    if (ts.isIdentifier(current) && names.has(current.text)) {
      found = true;
      return;
    }
    ts.forEachChild(current, visit);
  };

  visit(node);
  return found;
}

function isStageIndexExpression(node, stageNames) {
  const current = unwrapExpression(node);
  return (
    ((ts.isPropertyAccessExpression(current) &&
      current.name.text === 'index') ||
      (ts.isElementAccessExpression(current) &&
        staticPropertyName(current.argumentExpression) === 'index')) &&
    expressionContainsIdentifier(current.expression, stageNames)
  );
}

function hasStageOrdinalArithmetic(source, fileName) {
  const sourceFile = parseWorkbenchSource(source, fileName);
  let found = false;

  const isOne = (node) => {
    const current = unwrapExpression(node);
    return ts.isNumericLiteral(current) && current.text === '1';
  };
  const visitStageMap = (node) => {
    if (found) return;

    if (
      ts.isCallExpression(node) &&
      ((ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'map') ||
        (ts.isElementAccessExpression(node.expression) &&
          staticPropertyName(node.expression.argumentExpression) ===
            'map'))
    ) {
      const receiver = node.expression.expression;
      const callback = node.arguments[0];
      const collectionName = memberName(receiver);

      if (
        (collectionName === 'steps' || collectionName === 'stages') &&
        callback !== undefined &&
        (ts.isArrowFunction(callback) ||
          ts.isFunctionExpression(callback))
      ) {
        const stageNames = new Set();
        const ordinalNames = new Set();
        const firstParameter = callback.parameters[0]?.name;
        const secondParameter = callback.parameters[1]?.name;

        if (firstParameter && ts.isIdentifier(firstParameter)) {
          stageNames.add(firstParameter.text);
        }
        if (secondParameter && ts.isIdentifier(secondParameter)) {
          ordinalNames.add(secondParameter.text);
        }

        let changed = true;
        while (changed) {
          changed = false;
          const collectAliases = (current) => {
            if (
              ts.isVariableDeclaration(current) &&
              ts.isIdentifier(current.name) &&
              current.initializer !== undefined &&
              (isStageIndexExpression(
                current.initializer,
                stageNames,
              ) ||
                expressionContainsIdentifier(
                  current.initializer,
                  ordinalNames,
                )) &&
              !ordinalNames.has(current.name.text)
            ) {
              ordinalNames.add(current.name.text);
              changed = true;
            }
            ts.forEachChild(current, collectAliases);
          };
          ts.forEachChild(callback.body, collectAliases);
        }

        const isOrdinal = (expression) =>
          isStageIndexExpression(expression, stageNames) ||
          expressionContainsIdentifier(expression, ordinalNames);
        const findArithmetic = (current) => {
          if (found) return;
          if (
            ts.isBinaryExpression(current) &&
            current.operatorToken.kind === ts.SyntaxKind.PlusToken &&
            ((isOne(current.left) && isOrdinal(current.right)) ||
              (isOne(current.right) && isOrdinal(current.left)))
          ) {
            found = true;
            return;
          }
          if (
            (ts.isPrefixUnaryExpression(current) ||
              ts.isPostfixUnaryExpression(current)) &&
            (current.operator === ts.SyntaxKind.PlusPlusToken ||
              current.operator === ts.SyntaxKind.MinusMinusToken) &&
            isOrdinal(current.operand)
          ) {
            found = true;
            return;
          }
          ts.forEachChild(current, findArithmetic);
        };

        findArithmetic(callback.body);
      }
    }

    ts.forEachChild(node, visitStageMap);
  };

  visitStageMap(sourceFile);
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
    !normalized.includes('/__fixtures__/')
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

function annualComponentSemanticViolations(source, fileName) {
  const sourceFile = parseWorkbenchSource(source, fileName);
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
  const identifiers = new Set();
  const literals = new Set();

  const recordLiterals = (value) => {
    for (const literal of forbiddenLiterals) {
      if (value.includes(literal)) literals.add(literal);
    }
  };
  const recordRenderedExpression = (node) => {
    const visit = (current) => {
      if (ts.isStringLiteralLike(current)) {
        recordLiterals(current.text);
      } else if (ts.isTemplateHead(current)) {
        recordLiterals(current.text);
      }
      ts.forEachChild(current, visit);
    };
    visit(node);
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
      ts.isJsxExpression(node) &&
      !ts.isJsxAttribute(node.parent) &&
      node.expression !== undefined
    ) {
      recordRenderedExpression(node.expression);
    }
    if (
      ts.isJsxAttribute(node) &&
      node.initializer !== undefined &&
      ['aria-label', 'alt', 'placeholder', 'title'].includes(
        staticPropertyName(node.name),
      )
    ) {
      recordRenderedExpression(node.initializer);
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
        `annual component user-facing literal ${literal} is forbidden`,
    ),
  ];
}

function usesOrdinalAnnualStageSelection(source, fileName) {
  const sourceFile = parseWorkbenchSource(source, fileName);
  let found = false;

  const isIdentifier = (node, name) => {
    const current = unwrapExpression(node);
    return ts.isIdentifier(current) && current.text === name;
  };
  const isOne = (node) => {
    const current = unwrapExpression(node);
    return ts.isNumericLiteral(current) && current.text === '1';
  };
  const visit = (node) => {
    if (found) return;
    if (
      ts.isElementAccessExpression(node) &&
      memberName(node.expression) === 'stages' &&
      node.argumentExpression !== undefined
    ) {
      const argument = unwrapExpression(node.argumentExpression);
      if (
        ts.isBinaryExpression(argument) &&
        argument.operatorToken.kind === ts.SyntaxKind.MinusToken &&
        isIdentifier(argument.left, 'selectedStepIndex') &&
        isOne(argument.right)
      ) {
        found = true;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return found;
}

function yearSelectorViolations(source, fileName) {
  const sourceFile = parseWorkbenchSource(source, fileName);
  const violations = [];
  let importsCanonicalOptions = false;
  const copiedBoundaries = new Set();

  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      normalizePath(statement.moduleSpecifier.text).endsWith(
        '/lib/yunqi-year-range',
      ) &&
      statement.importClause?.namedBindings &&
      ts.isNamedImports(statement.importClause.namedBindings) &&
      statement.importClause.namedBindings.elements.some(
        (element) =>
          (element.propertyName?.text ?? element.name.text) ===
          'YUNQI_YEAR_OPTIONS',
      )
    ) {
      importsCanonicalOptions = true;
    }
  }

  const visit = (node) => {
    if (
      ts.isNumericLiteral(node) &&
      (node.text === '1901' || node.text === '2099')
    ) {
      copiedBoundaries.add(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  if (!importsCanonicalOptions) {
    violations.push(
      'must import YUNQI_YEAR_OPTIONS from lib/yunqi-year-range',
    );
  }
  for (const boundary of copiedBoundaries) {
    violations.push(
      `duplicated YunQi year boundary ${boundary} is forbidden`,
    );
  }

  return violations;
}

function sharedTupleMapperViolations(source, fileName) {
  const sourceFile = parseWorkbenchSource(source, fileName);
  const violations = [];
  const namedFunction = (name) =>
    sourceFile.statements.find(
      (statement) =>
        ts.isFunctionDeclaration(statement) &&
        statement.name?.text === name,
    );
  const tupleMapper = namedFunction('mapSixQiStageTuple');

  if (tupleMapper?.body) {
    let usesMap = false;
    const visit = (node) => {
      if (
        ts.isCallExpression(node) &&
        ((ts.isPropertyAccessExpression(node.expression) &&
          node.expression.name.text === 'map') ||
          (ts.isElementAccessExpression(node.expression) &&
            staticPropertyName(node.expression.argumentExpression) ===
              'map'))
      ) {
        usesMap = true;
        return;
      }
      ts.forEachChild(node, visit);
    };
    visit(tupleMapper.body);
    if (usesMap) {
      violations.push(
        'mapSixQiStageTuple must preserve the six-item tuple without .map()',
      );
    }
  }

  const stageMapper = namedFunction('mapSixQiStage');
  const positionParameter = stageMapper?.parameters[1]?.name;
  if (
    stageMapper?.body &&
    positionParameter &&
    ts.isIdentifier(positionParameter)
  ) {
    const positionNames = new Set([positionParameter.text]);
    let changed = true;
    while (changed) {
      changed = false;
      const collectAliases = (node) => {
        if (
          ts.isVariableDeclaration(node) &&
          ts.isIdentifier(node.name) &&
          node.initializer !== undefined &&
          expressionContainsIdentifier(node.initializer, positionNames) &&
          !positionNames.has(node.name.text)
        ) {
          positionNames.add(node.name.text);
          changed = true;
        }
        ts.forEachChild(node, collectAliases);
      };
      collectAliases(stageMapper.body);
    }

    let assignsPosition = false;
    const visit = (node) => {
      if (assignsPosition) return;
      if (
        ts.isPropertyAssignment(node) &&
        staticPropertyName(node.name) === 'index' &&
        expressionContainsIdentifier(node.initializer, positionNames)
      ) {
        assignsPosition = true;
        return;
      }
      if (
        ts.isShorthandPropertyAssignment(node) &&
        node.name.text === 'index' &&
        positionNames.has(node.name.text)
      ) {
        assignsPosition = true;
        return;
      }
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        memberName(node.left) === 'index' &&
        expressionContainsIdentifier(node.right, positionNames)
      ) {
        assignsPosition = true;
        return;
      }
      ts.forEachChild(node, visit);
    };
    visit(stageMapper.body);
    if (assignsPosition) {
      violations.push('mapSixQiStage must preserve step.index');
    }
  }

  return violations;
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

    if (isAnnualStageRailSource(file)) {
      if (!annualStageRailUsesCanonicalTimeline(source, file)) {
        violations.push(
          `${relativePath}: steps must consume CurrentSixQiStageTuple directly`,
        );
      }
      if (hasStageOrdinalArithmetic(source, file)) {
        violations.push(
          `${relativePath}: stage ordinal arithmetic is forbidden`,
        );
      }
    }

    if (isAnnualAnalysisComponentSource(file)) {
      for (const violation of annualComponentSemanticViolations(
        source,
        file,
      )) {
        violations.push(`${relativePath}: ${violation}`);
      }
      if (hasStageOrdinalArithmetic(source, file)) {
        violations.push(
          `${relativePath}: annual stage index must preserve the API stage index`,
        );
      }
      if (usesOrdinalAnnualStageSelection(source, file)) {
        violations.push(
          `${relativePath}: annual stage selection must match the API stage index`,
        );
      }
    }

    if (isYearSelectorSource(file)) {
      for (const violation of yearSelectorViolations(source, file)) {
        violations.push(`${relativePath}: ${violation}`);
      }
    }

    if (isSharedYunQiMapperSource(file)) {
      for (const violation of sharedTupleMapperViolations(
        source,
        file,
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
      if (hasDirectClientMethodAccess(source, file)) {
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

    if (hasContractDtoImport(source, file)) {
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
    if (hasDirectClientMethodAccess(source, file)) {
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
