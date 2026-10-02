import ts from 'typescript';

// Governed source must keep capability acquisition statically reviewable.
// This is deliberately a restricted syntax policy, not a JavaScript sandbox.
export function findComputedCapabilityViolations(source, fileName, { time = false } = {}) {
  fileName = fileName.replaceAll('\\', '/');
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const violations = new Set();
  if (governedImportEntries(source, fileName).some(({ specifier, runtime }) =>
    runtime && ['node:module', 'module'].includes(specifier))) {
    violations.add('module loader capability is forbidden');
  }
  const globals = new Set(['globalThis', 'window', 'self', 'global']);
  const staticText = (node) => {
    if (!node) return undefined;
    if (ts.isStringLiteralLike(node)) return node.text;
    if (ts.isParenthesizedExpression(node)) return staticText(node.expression);
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const left = staticText(node.left), right = staticText(node.right);
      if (left !== undefined && right !== undefined) return left + right;
    }
    return undefined;
  };
  const options = { noLib: true, noResolve: true, allowJs: true };
  const host = ts.createCompilerHost(options);
  host.getSourceFile = (name) => name === fileName ? file : undefined;
  const checker = ts.createProgram([fileName], options, host).getTypeChecker();
  const assignments = new Map();
  const collect = (node) => {
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(node.left)) {
      const symbol = checker.getSymbolAtLocation(node.left);
      if (symbol) assignments.set(symbol, [...(assignments.get(symbol) ?? []), node.right]);
    }
    ts.forEachChild(node, collect);
  };
  collect(file);
  const isGlobalObject = (node, seen = new Set()) => {
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node)) return isGlobalObject(node.expression, seen);
    if ((ts.isPropertyAccessExpression(node) && globals.has(node.name.text)) ||
        (ts.isElementAccessExpression(node) && globals.has(staticText(node.argumentExpression)))) return isGlobalObject(node.expression, seen);
    if (!ts.isIdentifier(node)) return false;
    const symbol = checker.getSymbolAtLocation(node);
    if (globals.has(node.text) && !symbol?.declarations?.length) return true;
    if (!symbol || seen.has(symbol)) return false;
    const next = new Set([...seen, symbol]);
    const declaration = symbol.valueDeclaration;
    const values = [...(assignments.get(symbol) ?? [])];
    if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer) values.push(declaration.initializer);
    if (declaration && ts.isBindingElement(declaration) && ts.isObjectBindingPattern(declaration.parent) &&
        globals.has((declaration.propertyName ?? declaration.name).text)) {
      const owner = declaration.parent.parent;
      if (ts.isVariableDeclaration(owner) && owner.initializer) values.push(owner.initializer);
    }
    return values.some((value) => isGlobalObject(value, next));
  };
  const visit = (node) => {
    if ((ts.isCallExpression(node) || ts.isNewExpression(node)) &&
        node.arguments?.some((argument) => isGlobalObject(argument))) {
      violations.add('passing a global capability object to an indirect accessor is forbidden');
    }
    if (ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
         (ts.isIdentifier(node.expression) && node.expression.text === 'require')) &&
        !ts.isStringLiteralLike(node.arguments[0] ?? file)) {
      violations.add('non-literal module capability acquisition is forbidden');
    }
    if (ts.isIdentifier(node) && node.text === 'require' &&
        !(ts.isCallExpression(node.parent) && node.parent.expression === node)) {
      violations.add('indirect require capability is forbidden');
    }
    if (ts.isIdentifier(node) && ['eval', 'Function', 'createRequire'].includes(node.text)) {
      violations.add('dynamic code or module capability acquisition is forbidden');
    }
    if ((ts.isElementAccessExpression(node) && staticText(node.argumentExpression) === 'constructor') ||
        (ts.isPropertyAccessExpression(node) && node.name.text === 'constructor')) {
      violations.add('constructor capability recovery is forbidden');
    }
    if (ts.isElementAccessExpression(node) && isGlobalObject(node.expression)) {
      const name = staticText(node.argumentExpression);
      if (!ts.isStringLiteralLike(node.argumentExpression) ||
          ['eval', 'Function', 'require'].includes(name) ||
          (time && ['Date', 'Intl', 'Temporal'].includes(name))) {
        violations.add('computed global capability access is forbidden');
      }
    }
    if (ts.isComputedPropertyName(node) && ts.isBindingElement(node.parent)) {
      const owner = node.parent.parent.parent;
      if (ts.isVariableDeclaration(owner) && owner.initializer && isGlobalObject(owner.initializer)) {
        violations.add('computed capability destructuring is forbidden');
      }
    }
    if (time && staticText(node)?.includes('Asia/Shanghai')) {
      violations.add('computed IANA business-time identifier is forbidden');
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return [...violations];
}

export function governedImportEntries(source, fileName) {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const entries = [];
  const add = (node, runtime = true) => {
    if (node && ts.isStringLiteralLike(node)) entries.push({ specifier: node.text, runtime });
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      const named = clause?.namedBindings;
      const typeOnly = clause?.isTypeOnly || (!clause?.name && named && ts.isNamedImports(named) &&
        named.elements.length > 0 && named.elements.every((e) => e.isTypeOnly));
      add(node.moduleSpecifier, !typeOnly);
    } else if (ts.isExportDeclaration(node)) {
      const clause = node.exportClause;
      const typeOnly = node.isTypeOnly || (clause && ts.isNamedExports(clause) &&
        clause.elements.length > 0 && clause.elements.every((e) => e.isTypeOnly));
      add(node.moduleSpecifier, !typeOnly);
    } else if (ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
         (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      add(node.arguments[0]);
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      add(node.moduleReference.expression, !node.isTypeOnly);
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      add(node.argument.literal, false);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return entries;
}
