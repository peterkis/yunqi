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

function staticStringValue(node, model, seenBindings = new Set()) {
  const current = unwrapExpression(node);

  if (ts.isStringLiteralLike(current)) return current.text;
  if (model && ts.isIdentifier(current)) {
    const binding = model.bindingForIdentifier(current);
    if (
      binding &&
      model.isImmutableConst(binding) &&
      !seenBindings.has(binding)
    ) {
      seenBindings.add(binding);
      const sources = model.sourcesFor(binding, current);
      const value =
        sources.length === 1 && sources[0].path.length === 0
          ? staticStringValue(
              sources[0].node,
              model,
              seenBindings,
            )
          : undefined;
      seenBindings.delete(binding);
      return value;
    }
  }
  if (
    ts.isBinaryExpression(current) &&
    current.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    const left = staticStringValue(current.left, model, seenBindings);
    const right = staticStringValue(current.right, model, seenBindings);
    return left === undefined || right === undefined
      ? undefined
      : left + right;
  }
  if (ts.isTemplateExpression(current)) {
    let value = current.head.text;
    for (const span of current.templateSpans) {
      const expression = staticStringValue(
        span.expression,
        model,
        seenBindings,
      );
      if (expression === undefined) return undefined;
      value += expression + span.literal.text;
    }
    return value;
  }

  return undefined;
}

function staticPropertyName(node, model) {
  if (node === undefined) return undefined;
  const current = unwrapExpression(node);

  if (ts.isIdentifier(current)) return current.text;
  if (ts.isComputedPropertyName(current)) {
    return staticStringValue(current.expression, model);
  }
  return staticStringValue(current, model);
}

function memberAccess(expression, model) {
  const current = unwrapExpression(expression);

  if (ts.isPropertyAccessExpression(current)) {
    return { name: current.name.text, receiver: current.expression };
  }
  if (ts.isElementAccessExpression(current)) {
    return {
      name: staticStringValue(current.argumentExpression, model),
      receiver: current.expression,
    };
  }

  return undefined;
}

function memberName(expression, model) {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) return current.text;
  return memberAccess(current, model)?.name;
}

function isFunctionLikeNode(node) {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node)
  );
}

function isIdentifierReference(node) {
  const parent = node.parent;

  if (
    (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
    ((ts.isPropertyAssignment(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isPropertySignature(parent)) &&
      parent.name === node) ||
    ((ts.isVariableDeclaration(parent) ||
      ts.isParameter(parent) ||
      ts.isFunctionDeclaration(parent) ||
      ts.isFunctionExpression(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isClassDeclaration(parent) ||
      ts.isInterfaceDeclaration(parent) ||
      ts.isTypeAliasDeclaration(parent)) &&
      parent.name === node) ||
    (ts.isBindingElement(parent) &&
      (parent.name === node || parent.propertyName === node)) ||
    ts.isImportSpecifier(parent) ||
    ts.isImportClause(parent) ||
    ts.isNamespaceImport(parent) ||
    ts.isExportSpecifier(parent) ||
    ts.isJsxAttribute(parent) ||
    ts.isJsxOpeningElement(parent) ||
    ts.isJsxClosingElement(parent) ||
    ts.isJsxSelfClosingElement(parent)
  ) {
    return false;
  }

  return true;
}

function createLexicalModel(sourceFile) {
  const nodeScopes = new WeakMap();
  const declarationBindings = new WeakMap();
  const allBindings = [];
  const rootScope = {
    bindings: new Map(),
    kind: 'root',
    parent: undefined,
  };

  // Sources retain both their availability point and an extraction path.
  // This keeps local analysis lexical (not runtime CFG evaluation) while
  // avoiding sibling-property taint and late-assignment reverse taint.
  const addSource = (
    binding,
    node,
    path = [],
    kind = 'declaration',
  ) => {
    if (!binding || node === undefined) return;
    binding.sources.push({
      availableAt: node.end,
      kind,
      node,
      path,
    });
  };

  const addBinding = (
    scope,
    nameNode,
    declaration,
    source,
    functionNode,
    metadata = {},
    sourcePath = [],
  ) => {
    if (!ts.isIdentifier(nameNode)) return undefined;
    const binding = {
      declaration,
      functionNode,
      isConst: metadata.isConst === true,
      kind: metadata.kind ?? 'local',
      name: nameNode.text,
      sources: [],
    };
    scope.bindings.set(binding.name, binding);
    declarationBindings.set(nameNode, binding);
    allBindings.push(binding);
    addSource(binding, source, sourcePath);
    return binding;
  };

  const bindingKey = (node) => {
    if (node === undefined) return undefined;
    const current = unwrapExpression(node);
    if (ts.isIdentifier(current) || ts.isStringLiteralLike(current)) {
      return current.text;
    }
    if (ts.isNumericLiteral(current)) return Number(current.text);
    if (ts.isComputedPropertyName(current)) {
      const value = staticStringValue(current.expression);
      return value === undefined ? undefined : value;
    }
    return undefined;
  };

  const patternEntries = (pattern) => {
    if (ts.isArrayBindingPattern(pattern)) {
      return pattern.elements.flatMap((element, index) =>
        ts.isOmittedExpression(element)
          ? []
          : [{ element, key: index }],
      );
    }
    return pattern.elements.map((element) => ({
      element,
      key: bindingKey(element.propertyName ?? element.name),
    }));
  };

  const bindPattern = (
    pattern,
    scope,
    declaration,
    source,
    functionNode,
    metadata = {},
    sourcePath = [],
  ) => {
    if (ts.isIdentifier(pattern)) {
      addBinding(
        scope,
        pattern,
        declaration,
        source,
        functionNode,
        metadata,
        sourcePath,
      );
      return;
    }

    for (const { element, key } of patternEntries(pattern)) {
      bindPattern(
        element.name,
        scope,
        element,
        source,
        undefined,
        metadata,
        key === undefined ? sourcePath : [...sourcePath, key],
      );
      if (element.initializer && ts.isIdentifier(element.name)) {
        const binding = declarationBindings.get(element.name);
        addSource(binding, element.initializer, [], 'default');
      }
    }
  };

  const nearestFunctionScope = (scope) => {
    let current = scope;
    while (current.kind !== 'function' && current.kind !== 'root') {
      current = current.parent;
    }
    return current;
  };

  const visit = (node, incomingScope) => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      addBinding(
        incomingScope,
        node.name,
        node,
        undefined,
        node,
        { kind: 'function' },
      );
    }
    if (ts.isVariableDeclaration(node)) {
      const declarationList = node.parent;
      const isBlockScoped = Boolean(
        declarationList.flags & ts.NodeFlags.BlockScoped,
      );
      const declarationScope = isBlockScoped
        ? incomingScope
        : nearestFunctionScope(incomingScope);
      const initializer = node.initializer
        ? unwrapExpression(node.initializer)
        : undefined;
      bindPattern(
        node.name,
        declarationScope,
        node,
        node.initializer,
        initializer && isFunctionLikeNode(initializer)
          ? initializer
          : undefined,
        {
          isConst: Boolean(
            declarationList.flags & ts.NodeFlags.Const,
          ),
          kind: 'variable',
        },
      );
    }
    if (ts.isImportDeclaration(node) && node.importClause) {
      if (node.importClause.name) {
        addBinding(
          incomingScope,
          node.importClause.name,
          node.importClause,
          undefined,
          undefined,
          { kind: 'import' },
        );
      }
      const namedBindings = node.importClause.namedBindings;
      if (namedBindings && ts.isNamedImports(namedBindings)) {
        for (const element of namedBindings.elements) {
          addBinding(
            incomingScope,
            element.name,
            element,
            undefined,
            undefined,
            { kind: 'import' },
          );
        }
      } else if (namedBindings && ts.isNamespaceImport(namedBindings)) {
        addBinding(
          incomingScope,
          namedBindings.name,
          namedBindings,
          undefined,
          undefined,
          { kind: 'import' },
        );
      }
    }

    let scope = incomingScope;
    if (
      node !== sourceFile &&
      (isFunctionLikeNode(node) ||
        ts.isBlock(node) ||
        ts.isCatchClause(node))
    ) {
      scope = {
        bindings: new Map(),
        kind: isFunctionLikeNode(node) ? 'function' : 'block',
        parent: incomingScope,
      };
    }
    nodeScopes.set(node, scope);

    if (isFunctionLikeNode(node)) {
      if (ts.isFunctionExpression(node) && node.name) {
        addBinding(scope, node.name, node, undefined, node);
      }
      for (const parameter of node.parameters) {
        bindPattern(
          parameter.name,
          scope,
          parameter,
          parameter.initializer,
          undefined,
          { kind: 'parameter' },
        );
      }
    }
    if (ts.isCatchClause(node) && node.variableDeclaration) {
      bindPattern(
        node.variableDeclaration.name,
        scope,
        node.variableDeclaration,
        node.variableDeclaration.initializer,
        undefined,
        { kind: 'catch' },
      );
    }

    ts.forEachChild(node, (child) => visit(child, scope));
  };

  nodeScopes.set(sourceFile, rootScope);
  ts.forEachChild(sourceFile, (child) => visit(child, rootScope));

  const bindingForIdentifier = (identifier) => {
    const declared = declarationBindings.get(identifier);
    if (declared) return declared;
    if (!isIdentifierReference(identifier)) return undefined;

    let scope = nodeScopes.get(identifier);
    while (scope) {
      const binding = scope.bindings.get(identifier.text);
      if (binding) return binding;
      scope = scope.parent;
    }
    return undefined;
  };

  const assignSource = (target, source, sourcePath = []) => {
    const current = unwrapExpression(target);
    if (ts.isIdentifier(current)) {
      addSource(
        bindingForIdentifier(current),
        source,
        sourcePath,
        'assignment',
      );
      return;
    }
    if (ts.isArrayLiteralExpression(current)) {
      current.elements.forEach((element, index) => {
        if (!ts.isOmittedExpression(element)) {
          assignSource(element, source, [...sourcePath, index]);
        }
      });
      return;
    }
    if (ts.isObjectLiteralExpression(current)) {
      for (const property of current.properties) {
        if (ts.isPropertyAssignment(property)) {
          const key = bindingKey(property.name);
          if (key !== undefined) {
            assignSource(
              property.initializer,
              source,
              [...sourcePath, key],
            );
          }
        } else if (ts.isShorthandPropertyAssignment(property)) {
          assignSource(
            property.name,
            source,
            [...sourcePath, property.name.text],
          );
        } else if (ts.isSpreadAssignment(property)) {
          assignSource(property.expression, source, sourcePath);
        }
      }
    }
  };
  const collectAssignments = (node) => {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      assignSource(node.left, node.right);
    }
    ts.forEachChild(node, collectAssignments);
  };
  collectAssignments(sourceFile);

  const sourcesFor = (binding, atNode) => {
    const usePosition = atNode?.getStart(sourceFile) ?? Infinity;
    return binding.sources.filter(
      (source) => source.availableAt <= usePosition,
    );
  };

  const functionLikeForExpression = (expression, seen = new Set()) => {
    const current = unwrapExpression(expression);
    if (isFunctionLikeNode(current)) return current;
    if (!ts.isIdentifier(current)) return undefined;
    const binding = bindingForIdentifier(current);
    if (!binding || seen.has(binding)) return undefined;
    if (binding.functionNode) return binding.functionNode;
    seen.add(binding);
    for (const source of sourcesFor(binding, current)) {
      if (source.path.length > 0) continue;
      const resolved = functionLikeForExpression(source.node, seen);
      if (resolved) return resolved;
    }
    return undefined;
  };

  return {
    bindingForDeclaration(identifier) {
      return declarationBindings.get(identifier);
    },
    bindingForIdentifier,
    bindingsNamed(names) {
      return new Set(
        allBindings.filter((binding) => names.has(binding.name)),
      );
    },
    functionLikeForExpression,
    isImportBinding(binding) {
      return binding.kind === 'import';
    },
    isImmutableConst(binding) {
      return (
        binding.isConst &&
        binding.sources.length === 1 &&
        binding.sources[0].kind === 'declaration'
      );
    },
    sourcesFor,
  };
}

function expressionDependsOn(
  node,
  seedBindings,
  model,
  state = { bindings: new Set(), functions: new Set() },
  projection = [],
) {
  if (node === undefined) return false;
  const current = unwrapExpression(node);

  if (ts.isIdentifier(current) && isIdentifierReference(current)) {
    const binding = model.bindingForIdentifier(current);
    if (!binding) return false;
    if (seedBindings.has(binding)) return true;
    if (state.bindings.has(binding) || binding.functionNode) {
      return false;
    }
    state.bindings.add(binding);
    const depends = model.sourcesFor(binding, current).some((source) =>
      expressionDependsOn(
        source.node,
        seedBindings,
        model,
        state,
        [...source.path, ...projection],
      ),
    );
    state.bindings.delete(binding);
    return depends;
  }

  if (isFunctionLikeNode(current)) return false;

  const access = memberAccess(current, model);
  if (access?.name !== undefined) {
    return expressionDependsOn(
      access.receiver,
      seedBindings,
      model,
      state,
      [access.name, ...projection],
    );
  }

  if (projection.length > 0) {
    const [property, ...rest] = projection;
    if (ts.isObjectLiteralExpression(current)) {
      let found = false;
      for (const entry of current.properties) {
        if (
          ts.isPropertyAssignment(entry) &&
          staticPropertyName(entry.name, model) === String(property)
        ) {
          found ||= expressionDependsOn(
            entry.initializer,
            seedBindings,
            model,
            state,
            rest,
          );
        } else if (
          ts.isShorthandPropertyAssignment(entry) &&
          entry.name.text === String(property)
        ) {
          found ||= expressionDependsOn(
            entry.name,
            seedBindings,
            model,
            state,
            rest,
          );
        } else if (ts.isSpreadAssignment(entry)) {
          found ||= expressionDependsOn(
            entry.expression,
            seedBindings,
            model,
            state,
            projection,
          );
        }
      }
      return found;
    }
    if (ts.isArrayLiteralExpression(current)) {
      const index = Number(property);
      const element = Number.isInteger(index)
        ? current.elements[index]
        : undefined;
      return Boolean(
        element &&
          !ts.isOmittedExpression(element) &&
          expressionDependsOn(
            element,
            seedBindings,
            model,
            state,
            rest,
          ),
      );
    }
    if (ts.isConditionalExpression(current)) {
      return (
        expressionDependsOn(
          current.whenTrue,
          seedBindings,
          model,
          state,
          projection,
        ) ||
        expressionDependsOn(
          current.whenFalse,
          seedBindings,
          model,
          state,
          projection,
        )
      );
    }
    if (ts.isCallExpression(current)) {
      const called = model.functionLikeForExpression(current.expression);
      if (called && !state.functions.has(called)) {
        state.functions.add(called);
        const depends = functionReturnExpressions(called).some((returned) =>
          expressionDependsOn(
            returned,
            seedBindings,
            model,
            state,
            projection,
          ),
        );
        state.functions.delete(called);
        return depends;
      }
    }
    return false;
  }

  if (ts.isCallExpression(current)) {
    if (
      current.arguments.some((argument) =>
        expressionDependsOn(argument, seedBindings, model, state),
      )
    ) {
      return true;
    }
    const called = model.functionLikeForExpression(current.expression);
    if (called && !state.functions.has(called)) {
      state.functions.add(called);
      const depends = functionReturnExpressions(called).some((returned) =>
        expressionDependsOn(returned, seedBindings, model, state),
      );
      state.functions.delete(called);
      if (depends) return true;
    }
  }

  let found = false;
  ts.forEachChild(current, (child) => {
    if (
      !found &&
      expressionDependsOn(child, seedBindings, model, state)
    ) {
      found = true;
    }
  });
  return found;
}

function functionReturnExpressions(functionNode) {
  if (!functionNode.body) return [];
  if (!ts.isBlock(functionNode.body)) return [functionNode.body];

  const returned = [];
  const root = functionNode.body;
  const visit = (node) => {
    if (node !== root && isFunctionLikeNode(node)) return;
    if (ts.isReturnStatement(node) && node.expression) {
      returned.push(node.expression);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return returned;
}

function expressionFlowContains(
  node,
  predicate,
  model,
  state = { bindings: new Set(), functions: new Set() },
) {
  if (node === undefined) return false;
  const current = unwrapExpression(node);
  if (predicate(current)) return true;

  if (ts.isIdentifier(current) && isIdentifierReference(current)) {
    const binding = model.bindingForIdentifier(current);
    if (!binding || state.bindings.has(binding)) return false;
    state.bindings.add(binding);
    const found = model.sourcesFor(binding, current).some((source) =>
      expressionFlowContains(source.node, predicate, model, state),
    );
    state.bindings.delete(binding);
    return found;
  }
  if (isFunctionLikeNode(current)) return false;

  if (ts.isCallExpression(current)) {
    const called = model.functionLikeForExpression(current.expression);
    if (called && !state.functions.has(called)) {
      state.functions.add(called);
      const found = functionReturnExpressions(called).some((returned) =>
        expressionFlowContains(returned, predicate, model, state),
      );
      state.functions.delete(called);
      if (found) return true;
    }
  }

  let found = false;
  ts.forEachChild(current, (child) => {
    if (!found && expressionFlowContains(child, predicate, model, state)) {
      found = true;
    }
  });
  return found;
}

function functionLikeByName(sourceFile, name) {
  for (const statement of sourceFile.statements) {
    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text === name
    ) {
      return statement;
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === name &&
          declaration.initializer !== undefined
        ) {
          const initializer = unwrapExpression(declaration.initializer);
          if (isFunctionLikeNode(initializer)) return initializer;
        }
      }
    }
  }
  return undefined;
}

function isMethodCall(node, methodName, model) {
  if (!ts.isCallExpression(node)) return false;
  return memberAccess(node.expression, model)?.name === methodName;
}

function isOne(node) {
  const current = unwrapExpression(node);
  return ts.isNumericLiteral(current) && current.text === '1';
}

function expressionDependsOnStageIndex(
  node,
  stageBindings,
  model,
  visitedBindings = new Set(),
) {
  if (node === undefined) return false;
  const current = unwrapExpression(node);
  const access = memberAccess(current, model);

  if (
    access?.name === 'index' &&
    expressionDependsOn(access.receiver, stageBindings, model)
  ) {
    return true;
  }
  if (ts.isIdentifier(current) && isIdentifierReference(current)) {
    const binding = model.bindingForIdentifier(current);
    if (!binding || visitedBindings.has(binding)) return false;
    visitedBindings.add(binding);
    const depends = model.sourcesFor(binding, current).some((source) =>
      expressionDependsOnStageIndex(
        source.node,
        stageBindings,
        model,
        visitedBindings,
      ),
    );
    visitedBindings.delete(binding);
    return depends;
  }
  if (isFunctionLikeNode(current)) return false;

  let found = false;
  ts.forEachChild(current, (child) => {
    if (
      !found &&
      expressionDependsOnStageIndex(
        child,
        stageBindings,
        model,
        visitedBindings,
      )
    ) {
      found = true;
    }
  });
  return found;
}

function hasStageOrdinalArithmetic(sourceFile, model) {
  const collectionBindings = model.bindingsNamed(
    new Set(['stages', 'steps']),
  );
  let found = false;

  const visitStageMap = (node) => {
    if (found) return;
    if (isMethodCall(node, 'map', model)) {
      const receiver = memberAccess(node.expression, model).receiver;
      const callback = node.arguments[0];
      if (
        (memberName(receiver, model) === 'steps' ||
          memberName(receiver, model) === 'stages' ||
          expressionDependsOn(
            receiver,
            collectionBindings,
            model,
          )) &&
        callback !== undefined &&
        model.functionLikeForExpression(callback)?.body
      ) {
        const callbackNode = model.functionLikeForExpression(callback);
        const stageParameter = callbackNode.parameters[0]?.name;
        const positionParameter = callbackNode.parameters[1]?.name;
        const stageBinding =
          stageParameter && ts.isIdentifier(stageParameter)
            ? model.bindingForDeclaration(stageParameter)
            : undefined;
        const positionBinding =
          positionParameter && ts.isIdentifier(positionParameter)
            ? model.bindingForDeclaration(positionParameter)
            : undefined;
        const stageBindings = new Set(
          stageBinding ? [stageBinding] : [],
        );
        const positionBindings = new Set(
          positionBinding ? [positionBinding] : [],
        );
        const isOrdinalArithmetic = (current) =>
          ts.isBinaryExpression(current) &&
          current.operatorToken.kind === ts.SyntaxKind.PlusToken &&
          ((isOne(current.left) &&
            (expressionDependsOn(
              current.right,
              positionBindings,
              model,
            ) ||
              expressionDependsOnStageIndex(
                current.right,
                stageBindings,
                model,
              ))) ||
            (isOne(current.right) &&
              (expressionDependsOn(
                current.left,
                positionBindings,
                model,
              ) ||
                expressionDependsOnStageIndex(
                  current.left,
                  stageBindings,
                  model,
                ))));
        found = functionReturnExpressions(callbackNode).some((returned) =>
          expressionFlowContains(
            returned,
            isOrdinalArithmetic,
            model,
          ),
        );
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

function annualComponentSemanticViolations(sourceFile, model) {
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
  const renderedImports = new Set();
  const literals = new Set();

  const recordLiterals = (value) => {
    for (const literal of forbiddenLiterals) {
      if (value.includes(literal)) literals.add(literal);
    }
  };
  const recordRenderedExpression = (
    node,
    visitedBindings = new Set(),
  ) => {
    const current = unwrapExpression(node);
    if (isFunctionLikeNode(current)) return;
    if (ts.isStringLiteralLike(current)) {
      recordLiterals(current.text);
      return;
    }
    if (ts.isTemplateExpression(current)) {
      recordLiterals(current.head.text);
      for (const span of current.templateSpans) {
        recordRenderedExpression(span.expression, visitedBindings);
        recordLiterals(span.literal.text);
      }
      return;
    }
    if (ts.isIdentifier(current) && isIdentifierReference(current)) {
      const binding = model.bindingForIdentifier(current);
      if (!binding || binding.functionNode || visitedBindings.has(binding)) {
        return;
      }
      if (model.isImportBinding(binding)) {
        renderedImports.add(binding.name);
        return;
      }
      visitedBindings.add(binding);
      for (const source of model.sourcesFor(binding, current)) {
        recordRenderedExpression(source.node, visitedBindings);
      }
      visitedBindings.delete(binding);
      return;
    }
    if (ts.isCallExpression(current)) {
      for (const argument of current.arguments) {
        recordRenderedExpression(argument, visitedBindings);
      }
      return;
    }
    ts.forEachChild(current, (child) =>
      recordRenderedExpression(child, visitedBindings),
    );
  };
  const isCustomJsxAttribute = (attribute) => {
    const opening = attribute.parent?.parent;
    if (
      !opening ||
      (!ts.isJsxOpeningElement(opening) &&
        !ts.isJsxSelfClosingElement(opening))
    ) {
      return false;
    }
    return (
      !ts.isIdentifier(opening.tagName) ||
      /^[A-Z]/.test(opening.tagName.text)
    );
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
      (isCustomJsxAttribute(node) ||
        ['aria-label', 'alt', 'placeholder', 'title'].includes(
          staticPropertyName(node.name),
        ))
    ) {
      if (ts.isStringLiteral(node.initializer)) {
        recordRenderedExpression(node.initializer);
      } else if (
        ts.isJsxExpression(node.initializer) &&
        node.initializer.expression !== undefined
      ) {
        recordRenderedExpression(node.initializer.expression);
      }
    }
    if (ts.isJsxSpreadAttribute(node)) {
      recordRenderedExpression(node.expression);
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
    ...[...renderedImports].map(
      (name) =>
        `annual component rendered import ${name} is not statically auditable`,
    ),
  ];
}

function usesOrdinalAnnualStageSelection(sourceFile, model) {
  let found = false;
  const collectionBindings = model.bindingsNamed(new Set(['stages']));
  const indexBindings = model.bindingsNamed(
    new Set(['selectedStepIndex']),
  );
  const visit = (node) => {
    if (found) return;
    if (
      ts.isElementAccessExpression(node) &&
      node.argumentExpression !== undefined
    ) {
      const argument = unwrapExpression(node.argumentExpression);
      if (
        (memberName(node.expression) === 'stages' ||
          expressionDependsOn(
            node.expression,
            collectionBindings,
            model,
          )) &&
        ts.isBinaryExpression(argument) &&
        argument.operatorToken.kind === ts.SyntaxKind.MinusToken &&
        expressionDependsOn(argument.left, indexBindings, model) &&
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

function yearSelectorViolations(sourceFile, fileName, model) {
  const violations = [];
  let canonicalBinding;
  const copiedBoundaries = new Set();
  const expectedModule = resolve(
    dirname(fileName),
    '../../../../lib/yunqi-year-range',
  );

  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      resolve(dirname(fileName), statement.moduleSpecifier.text) ===
        expectedModule &&
      !statement.importClause?.isTypeOnly &&
      statement.importClause?.namedBindings &&
      ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      const imported =
        statement.importClause.namedBindings.elements.find(
          (element) =>
            !element.isTypeOnly &&
            element.propertyName === undefined &&
            element.name.text === 'YUNQI_YEAR_OPTIONS',
        );
      if (imported) {
        canonicalBinding = model.bindingForDeclaration(imported.name);
      }
    }
  }

  let consumesBinding = false;
  const renderedOptionMaps = [];

  const isCanonicalAlias = (node, seenBindings = new Set()) => {
    const current = unwrapExpression(node);
    if (!ts.isIdentifier(current)) return false;
    const binding = model.bindingForIdentifier(current);
    if (!binding) return false;
    if (binding === canonicalBinding) return true;
    if (
      seenBindings.has(binding) ||
      !model.isImmutableConst(binding)
    ) {
      return false;
    }
    seenBindings.add(binding);
    const sources = model.sourcesFor(binding, current);
    const result =
      sources.length === 1 &&
      sources[0].path.length === 0 &&
      isCanonicalAlias(sources[0].node, seenBindings);
    seenBindings.delete(binding);
    return result;
  };

  const mapProducesOptionChildren = (node) => {
    if (!isMethodCall(node, 'map', model)) return false;
    const callback = model.functionLikeForExpression(node.arguments[0]);
    const itemParameter = callback?.parameters[0]?.name;
    const itemBinding =
      itemParameter && ts.isIdentifier(itemParameter)
        ? model.bindingForDeclaration(itemParameter)
        : undefined;
    if (!callback || !itemBinding) return false;

    let producesOption = false;
    const visitReturned = (current) => {
      if (producesOption) return;
      if (
        ts.isJsxElement(current) &&
        ts.isIdentifier(current.openingElement.tagName) &&
        current.openingElement.tagName.text === 'option'
      ) {
        producesOption = current.children.some(
          (child) =>
            ts.isJsxExpression(child) &&
            child.expression !== undefined &&
            expressionDependsOn(
              child.expression,
              new Set([itemBinding]),
              model,
            ),
        );
        if (producesOption) return;
      }
      ts.forEachChild(current, visitReturned);
    };
    for (const returned of functionReturnExpressions(callback)) {
      visitReturned(returned);
    }
    return producesOption;
  };

  const collectRenderedOptionMaps = (
    node,
    state = { bindings: new Set(), functions: new Set() },
  ) => {
    const current = unwrapExpression(node);
    if (mapProducesOptionChildren(current)) {
      renderedOptionMaps.push(current);
      return;
    }
    if (ts.isIdentifier(current) && isIdentifierReference(current)) {
      const binding = model.bindingForIdentifier(current);
      if (!binding || state.bindings.has(binding)) return;
      state.bindings.add(binding);
      for (const source of model.sourcesFor(binding, current)) {
        collectRenderedOptionMaps(source.node, state);
      }
      state.bindings.delete(binding);
      return;
    }
    if (isFunctionLikeNode(current)) return;
    if (ts.isCallExpression(current)) {
      const called = model.functionLikeForExpression(current.expression);
      if (called && !state.functions.has(called)) {
        state.functions.add(called);
        for (const returned of functionReturnExpressions(called)) {
          collectRenderedOptionMaps(returned, state);
        }
        state.functions.delete(called);
      }
    }
    ts.forEachChild(current, (child) =>
      collectRenderedOptionMaps(child, state),
    );
  };

  const visit = (node) => {
    if (
      ts.isNumericLiteral(node) &&
      (node.text === '1901' || node.text === '2099')
    ) {
      copiedBoundaries.add(node.text);
    }
    if (
      canonicalBinding &&
      ts.isIdentifier(node) &&
      isIdentifierReference(node) &&
      model.bindingForIdentifier(node) === canonicalBinding
    ) {
      consumesBinding = true;
    }
    if (
      ts.isJsxExpression(node) &&
      !ts.isJsxAttribute(node.parent) &&
      node.expression !== undefined
    ) {
      collectRenderedOptionMaps(node.expression);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  if (!canonicalBinding) {
    violations.push(
      'must import YUNQI_YEAR_OPTIONS from lib/yunqi-year-range',
    );
  }
  if (canonicalBinding && !consumesBinding) {
    violations.push('must consume imported YUNQI_YEAR_OPTIONS');
  }
  if (
    canonicalBinding &&
    consumesBinding &&
    (renderedOptionMaps.length === 0 ||
      renderedOptionMaps.some((mapCall) => {
        const receiver = memberAccess(mapCall.expression, model)?.receiver;
        return !receiver || !isCanonicalAlias(receiver);
      }))
  ) {
    violations.push(
      'must render YUNQI_YEAR_OPTIONS directly without rebuilding',
    );
  }
  for (const boundary of copiedBoundaries) {
    violations.push(
      `duplicated YunQi year boundary ${boundary} is forbidden`,
    );
  }

  return violations;
}

function sharedTupleMapperViolations(sourceFile, model) {
  const violations = [];
  const tupleMapper = functionLikeByName(
    sourceFile,
    'mapSixQiStageTuple',
  );

  if (tupleMapper?.body) {
    const usesMap = functionReturnExpressions(tupleMapper).some(
      (returned) =>
        expressionFlowContains(
          returned,
          (node) => isMethodCall(node, 'map', model),
          model,
        ),
    );
    if (usesMap) {
      violations.push(
        'mapSixQiStageTuple must preserve the six-item tuple without .map()',
      );
    }
  }

  const stageMapper = functionLikeByName(sourceFile, 'mapSixQiStage');
  const positionParameter = stageMapper?.parameters[1]?.name;
  if (
    stageMapper?.body &&
    positionParameter &&
    ts.isIdentifier(positionParameter)
  ) {
    const positionBinding = model.bindingForDeclaration(
      positionParameter,
    );
    const positionBindings = new Set(
      positionBinding ? [positionBinding] : [],
    );
    let assignsPosition = false;
    const visit = (node) => {
      if (assignsPosition) return;
      if (
        ts.isPropertyAssignment(node) &&
        staticPropertyName(node.name, model) === 'index' &&
        expressionDependsOn(
          node.initializer,
          positionBindings,
          model,
        )
      ) {
        assignsPosition = true;
        return;
      }
      if (
        ts.isShorthandPropertyAssignment(node) &&
        node.name.text === 'index' &&
        expressionDependsOn(node.name, positionBindings, model)
      ) {
        assignsPosition = true;
        return;
      }
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        memberName(node.left, model) === 'index' &&
        expressionDependsOn(node.right, positionBindings, model)
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
    const sourceFile = parseWorkbenchSource(source, file);
    let lexicalModel;
    const getLexicalModel = () => {
      lexicalModel ??= createLexicalModel(sourceFile);
      return lexicalModel;
    };

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
      if (!annualStageRailUsesCanonicalTimeline(sourceFile)) {
        violations.push(
          `${relativePath}: steps must consume CurrentSixQiStageTuple directly`,
        );
      }
      if (hasStageOrdinalArithmetic(sourceFile, getLexicalModel())) {
        violations.push(
          `${relativePath}: stage ordinal arithmetic is forbidden`,
        );
      }
    }

    if (isAnnualAnalysisComponentSource(file)) {
      for (const violation of annualComponentSemanticViolations(
        sourceFile,
        getLexicalModel(),
      )) {
        violations.push(`${relativePath}: ${violation}`);
      }
      if (hasStageOrdinalArithmetic(sourceFile, getLexicalModel())) {
        violations.push(
          `${relativePath}: annual stage index must preserve the API stage index`,
        );
      }
      if (
        usesOrdinalAnnualStageSelection(
          sourceFile,
          getLexicalModel(),
        )
      ) {
        violations.push(
          `${relativePath}: annual stage selection must match the API stage index`,
        );
      }
    }

    if (isYearSelectorSource(file)) {
      for (const violation of yearSelectorViolations(
        sourceFile,
        file,
        getLexicalModel(),
      )) {
        violations.push(`${relativePath}: ${violation}`);
      }
    }

    if (isSharedYunQiMapperSource(file)) {
      for (const violation of sharedTupleMapperViolations(
        sourceFile,
        getLexicalModel(),
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
