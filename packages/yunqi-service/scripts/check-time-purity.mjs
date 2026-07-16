import { readdir, readFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  LanguageVariant,
  SyntaxKind,
  createScanner,
} from 'typescript/unstable/ast';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NORMALIZER_DIRECTORY = 'src/modules/time-normalizer/';
const DOMAIN_TIME_FACTORIES = new Set([
  'createYunQiCalendarTime',
  'createYunQiCalendarTimeFromInstant',
  'createYunQiInstant',
]);
const DOMAIN_TIME_CONVERSION_APIS = new Set([
  ...DOMAIN_TIME_FACTORIES,
  'assertYunQiCalendarTime',
  'assertYunQiInstant',
  'compareBeijingLocalDateTime',
  'formatYunQiCalendarTime',
  'formatYunQiInstant',
  'getBeijingCivilYear',
  'BEIJING_CALENDAR_TIME_STANDARD',
  'BEIJING_STANDARD_OFFSET',
]);
const PROTECTED_TIME_FIELDS = new Set([
  'epochMilliseconds',
  'calendarTimeStandard',
]);
const CALENDAR_ADAPTER_INPUT_APIS = new Set([
  'DateTimeInput',
  'toYunQiInstant',
]);
const FORBIDDEN_API_LITERALS = new Map([
  ['Date', 'computed Date API'],
  ['Temporal', 'computed Temporal API'],
  ['Intl', 'computed Intl API'],
]);
const DATE_TIME_PATTERN_SIGNAL =
  /(?:\\d|\[0-9\])\{4\}[\s\S]*T[\s\S]*(?:\\d|\[0-9\])\{2\}[\s\S]*:[\s\S]*(?:\\d|\[0-9\])\{2\}/;
const DATE_TIME_PARSER_METHODS = new Set([
  'exec',
  'match',
  'matchAll',
  'test',
]);
const FIXED_BEIJING_OFFSET_MILLISECONDS = 28_800_000;
const HOUR_MILLISECONDS = 3_600_000;

async function collectTypeScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = resolve(directory, entry.name);
      if (entry.isDirectory()) return collectTypeScriptFiles(target);
      return entry.isFile() && entry.name.endsWith('.ts') ? [target] : [];
    }),
  );
  return nested.flat();
}

function normalizePath(value) {
  return value.replaceAll('\\', '/');
}

function scanTokens(source) {
  const scanner = createScanner(true, LanguageVariant.Standard, source);
  const tokens = [];

  for (;;) {
    const kind = scanner.scan();
    if (kind === SyntaxKind.EndOfFile) break;
    tokens.push({
      kind,
      text: scanner.getTokenText(),
      value: scanner.getTokenValue(),
    });
  }

  return tokens;
}

function isIdentifier(token, value) {
  return token?.kind === SyntaxKind.Identifier && token.value === value;
}

function isMemberAccess(token) {
  return (
    token?.kind === SyntaxKind.DotToken ||
    token?.kind === SyntaxKind.QuestionDotToken
  );
}

function isAllowedRuntimeClockReference(tokens, index, relativePath) {
  if (relativePath !== 'src/server.ts') return false;

  const beforeProperty = tokens[index - 3];
  const propertyName = tokens[index - 2];
  const colon = tokens[index - 1];
  const memberAccess = tokens[index + 1];
  const memberName = tokens[index + 2];
  const afterReference = tokens[index + 3];

  return (
    (beforeProperty?.kind === SyntaxKind.OpenBraceToken ||
      beforeProperty?.kind === SyntaxKind.CommaToken) &&
    isIdentifier(propertyName, 'now') &&
    colon?.kind === SyntaxKind.ColonToken &&
    memberAccess?.kind === SyntaxKind.DotToken &&
    isIdentifier(memberName, 'now') &&
    (afterReference?.kind === SyntaxKind.CommaToken ||
      afterReference?.kind === SyntaxKind.CloseBraceToken)
  );
}

function isNumericLiteral(token) {
  return token?.kind === SyntaxKind.NumericLiteral;
}

function parseMultiplicativeExpression(tokens, start) {
  function parseFactor(index) {
    const token = tokens[index];

    if (isNumericLiteral(token)) {
      return {
        value: Number(token.value),
        end: index + 1,
      };
    }

    if (token?.kind === SyntaxKind.OpenParenToken) {
      const nested = parseProduct(index + 1);
      if (tokens[nested.end]?.kind !== SyntaxKind.CloseParenToken) {
        return undefined;
      }
      return {
        value: nested.value,
        end: nested.end + 1,
      };
    }

    return undefined;
  }

  function parseProduct(index) {
    const first = parseFactor(index);
    if (first === undefined) {
      return { value: Number.NaN, end: index };
    }

    let value = first.value;
    let end = first.end;

    while (tokens[end]?.kind === SyntaxKind.AsteriskToken) {
      const next = parseFactor(end + 1);
      if (next === undefined) break;
      value *= next.value;
      end = next.end;
    }

    return { value, end };
  }

  return parseProduct(start);
}

function isFixedBeijingOffsetArithmetic(tokens, index) {
  if (
    !isNumericLiteral(tokens[index]) &&
    tokens[index]?.kind !== SyntaxKind.OpenParenToken
  ) {
    return false;
  }

  const expression = parseMultiplicativeExpression(tokens, index);
  return (
    expression.end > index &&
    expression.value === FIXED_BEIJING_OFFSET_MILLISECONDS
  );
}

function hasNamedHourOffsetArithmetic(tokens) {
  const hourBindings = new Set();

  for (let index = 0; index < tokens.length; index += 1) {
    if (
      tokens[index].kind !== SyntaxKind.Identifier ||
      tokens[index + 1]?.kind !== SyntaxKind.EqualsToken
    ) {
      continue;
    }

    const expression = parseMultiplicativeExpression(tokens, index + 2);
    if (expression.value === HOUR_MILLISECONDS) {
      hourBindings.add(tokens[index].value);
    }
  }

  for (let index = 0; index < tokens.length - 2; index += 1) {
    const left = tokens[index];
    const operator = tokens[index + 1];
    const right = tokens[index + 2];

    if (operator.kind !== SyntaxKind.AsteriskToken) continue;
    if (
      (isNumericLiteral(left) &&
        Number(left.value) === 8 &&
        right.kind === SyntaxKind.Identifier &&
        hourBindings.has(right.value)) ||
      (left.kind === SyntaxKind.Identifier &&
        hourBindings.has(left.value) &&
        isNumericLiteral(right) &&
        Number(right.value) === 8)
    ) {
      return true;
    }
  }

  return false;
}

function isTimeNormalizerInternalImport(value) {
  const normalized = value.replaceAll('\\', '/');
  const marker = '/time-normalizer/';
  const markerIndex = normalized.lastIndexOf(marker);
  if (markerIndex === -1) return false;

  const importedModule = normalized.slice(markerIndex + marker.length);
  return !/^index(?:\.[cm]?[jt]s)?$/.test(importedModule);
}

function findDomainTimeImportViolations(tokens) {
  const labels = new Set();

  for (let index = 0; index < tokens.length; index += 1) {
    if (
      tokens[index].kind !== SyntaxKind.StringLiteral ||
      tokens[index].value !== '@yunqi/domain'
    ) {
      continue;
    }

    if (
      tokens[index - 1]?.kind === SyntaxKind.OpenParenToken &&
      tokens[index - 2]?.kind === SyntaxKind.ImportKeyword
    ) {
      labels.add('Dynamic Domain import outside normalizer');
      continue;
    }

    let clauseStart = index - 1;
    while (
      clauseStart >= 0 &&
      tokens[clauseStart].kind !== SyntaxKind.SemicolonToken
    ) {
      clauseStart -= 1;
    }
    const clause = tokens.slice(clauseStart + 1, index);

    if (clause.some((token) => token.kind === SyntaxKind.AsteriskToken)) {
      labels.add('Domain namespace import outside normalizer');
    }

    for (const token of clause) {
      if (
        token.kind === SyntaxKind.Identifier &&
        DOMAIN_TIME_CONVERSION_APIS.has(token.value)
      ) {
        labels.add('Domain time conversion import outside normalizer');
      }
    }
  }

  return labels;
}

function findCalendarAdapterImportViolations(tokens) {
  const labels = new Set();

  for (let index = 0; index < tokens.length; index += 1) {
    if (
      tokens[index].kind !== SyntaxKind.StringLiteral ||
      tokens[index].value !== '@yunqi/calendar-adapter-tyme4ts'
    ) {
      continue;
    }

    if (
      tokens[index - 1]?.kind === SyntaxKind.OpenParenToken &&
      tokens[index - 2]?.kind === SyntaxKind.ImportKeyword
    ) {
      labels.add('Dynamic calendar adapter import outside normalizer');
      continue;
    }

    let clauseStart = index - 1;
    while (
      clauseStart >= 0 &&
      tokens[clauseStart].kind !== SyntaxKind.SemicolonToken
    ) {
      clauseStart -= 1;
    }
    const clause = tokens.slice(clauseStart + 1, index);

    if (clause.some((token) => token.kind === SyntaxKind.AsteriskToken)) {
      labels.add('Calendar adapter namespace import outside normalizer');
    }

    for (const token of clause) {
      if (
        token.kind === SyntaxKind.Identifier &&
        CALENDAR_ADAPTER_INPUT_APIS.has(token.value)
      ) {
        labels.add('Calendar adapter input conversion outside normalizer');
      }
    }
  }

  return labels;
}

function collectObjectFieldSets(tokens) {
  const stack = [];
  const fieldSets = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token.kind === SyntaxKind.OpenBraceToken) {
      stack.push(new Set());
      continue;
    }

    if (token.kind === SyntaxKind.CloseBraceToken) {
      const fields = stack.pop();
      if (fields !== undefined) fieldSets.push(fields);
      continue;
    }

    const current = stack.at(-1);
    if (current === undefined) continue;

    const previous = tokens[index - 1];
    const next = tokens[index + 1];
    const isPropertyName =
      token.kind === SyntaxKind.Identifier ||
      token.kind === SyntaxKind.StringLiteral;
    const isNamedProperty = next?.kind === SyntaxKind.ColonToken;
    const isShorthandProperty =
      token.kind === SyntaxKind.Identifier &&
      (previous?.kind === SyntaxKind.OpenBraceToken ||
        previous?.kind === SyntaxKind.CommaToken) &&
      (next?.kind === SyntaxKind.CommaToken ||
        next?.kind === SyntaxKind.CloseBraceToken);

    if (isPropertyName && (isNamedProperty || isShorthandProperty)) {
      current.add(token.value);
    }
  }

  return fieldSets;
}

function isTimeContractDeclaration(relativePath) {
  return (
    relativePath.startsWith('src/schemas/') ||
    relativePath === 'src/contracts/generated-client.ts'
  );
}

function hasStableApiDateTimeBinding(tokens, relativePath) {
  if (relativePath !== 'src/routes/yunqi.ts') return false;

  const bindingOccurrences = tokens.filter((token) =>
    isIdentifier(token, 'normalizeApiDateTime'),
  );
  if (bindingOccurrences.length !== 2) return false;

  for (let index = 0; index < tokens.length; index += 1) {
    if (
      tokens[index].kind !== SyntaxKind.StringLiteral ||
      tokens[index].value !== '../modules/time-normalizer/index.js'
    ) {
      continue;
    }

    let clauseStart = index - 1;
    while (
      clauseStart >= 0 &&
      tokens[clauseStart].kind !== SyntaxKind.SemicolonToken
    ) {
      clauseStart -= 1;
    }
    const clause = tokens.slice(clauseStart + 1, index);
    const bindingIndex = clause.findIndex((token) =>
      isIdentifier(token, 'normalizeApiDateTime'),
    );

    if (
      clause.some((token) => token.kind === SyntaxKind.ImportKeyword) &&
      bindingIndex >= 0 &&
      (clause[bindingIndex - 1]?.kind === SyntaxKind.OpenBraceToken ||
        clause[bindingIndex - 1]?.kind === SyntaxKind.CommaToken) &&
      (clause[bindingIndex + 1]?.kind === SyntaxKind.CloseBraceToken ||
        clause[bindingIndex + 1]?.kind === SyntaxKind.CommaToken)
    ) {
      return true;
    }
  }

  return false;
}

function isAllowedApiDateTimeBoundary(
  tokens,
  index,
  relativePath,
  hasStableBinding,
) {
  return (
    relativePath === 'src/routes/yunqi.ts' &&
    hasStableBinding &&
    isIdentifier(tokens[index - 6], 'normalizeApiDateTime') &&
    tokens[index - 5]?.kind === SyntaxKind.OpenParenToken &&
    isIdentifier(tokens[index - 4], 'request') &&
    tokens[index - 3]?.kind === SyntaxKind.DotToken &&
    isIdentifier(tokens[index - 2], 'body') &&
    tokens[index - 1]?.kind === SyntaxKind.DotToken &&
    tokens[index + 1]?.kind === SyntaxKind.CloseParenToken
  );
}

function isAllowedCivilYearAccess(tokens, index, relativePath) {
  return (
    relativePath === 'src/services/yunqi-service.ts' &&
    isIdentifier(tokens[index - 2], 'input') &&
    tokens[index - 1]?.kind === SyntaxKind.DotToken &&
    tokens[index + 1]?.kind === SyntaxKind.DotToken &&
    isIdentifier(tokens[index + 2], 'year')
  );
}

function findFileViolations(relativePath, source) {
  const tokens = scanTokens(source);
  const labels = new Set();
  const isNormalizer = relativePath.startsWith(NORMALIZER_DIRECTORY);
  const isContractDeclaration = isTimeContractDeclaration(relativePath);
  const hasStableDateTimeBinding = hasStableApiDateTimeBinding(
    tokens,
    relativePath,
  );
  let runtimeClockReferences = 0;
  let hasDateTimeParserInvocation = false;
  let hasBeijingOffsetText = source.includes('+08:00');
  let hasPadStart = false;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const previous = tokens[index - 1];
    const next = tokens[index + 1];
    const afterNext = tokens[index + 2];

    if (isIdentifier(token, 'Date')) {
      if (isAllowedRuntimeClockReference(tokens, index, relativePath)) {
        runtimeClockReferences += 1;
      } else {
        labels.add('Date API outside isolated runtime clock');
      }
    }

    if (
      isMemberAccess(previous) &&
      isIdentifier(token, 'toISOString') &&
      next?.kind === SyntaxKind.OpenParenToken
    ) {
      labels.add('ISO string conversion');
    }

    if (
      isMemberAccess(previous) &&
      token.kind === SyntaxKind.Identifier &&
      DATE_TIME_PARSER_METHODS.has(token.value)
    ) {
      hasDateTimeParserInvocation = true;
    }

    if (isIdentifier(token, 'padStart')) {
      hasPadStart = true;
    }

    if (!isNormalizer && !isContractDeclaration) {
      if (
        token.kind === SyntaxKind.Identifier &&
        PROTECTED_TIME_FIELDS.has(token.value)
      ) {
        labels.add('Business time representation access outside normalizer');
      }
      if (
        isIdentifier(token, 'localDateTime') &&
        !isAllowedCivilYearAccess(tokens, index, relativePath)
      ) {
        labels.add('Calendar field access outside normalizer');
      }
      if (
        isIdentifier(token, 'dateTime') &&
        !isAllowedApiDateTimeBoundary(
          tokens,
          index,
          relativePath,
          hasStableDateTimeBinding,
        )
      ) {
        labels.add('Raw API dateTime access outside normalizer boundary');
      }
    }

    if (!isNormalizer && isFixedBeijingOffsetArithmetic(tokens, index)) {
      labels.add('Fixed Beijing offset arithmetic outside normalizer');
    }

    if (isIdentifier(token, 'Temporal')) labels.add('Temporal API');
    if (isIdentifier(token, 'Intl')) labels.add('Intl API');

    if (
      (token.kind === SyntaxKind.StringLiteral ||
        token.kind === SyntaxKind.NoSubstitutionTemplateLiteral ||
        token.kind === SyntaxKind.TemplateHead ||
        token.kind === SyntaxKind.TemplateMiddle ||
        token.kind === SyntaxKind.TemplateTail)
    ) {
      const computedApi = FORBIDDEN_API_LITERALS.get(token.value);
      if (computedApi !== undefined) {
        labels.add(computedApi);
      }
      if (!isNormalizer && DOMAIN_TIME_FACTORIES.has(token.value)) {
        labels.add('Computed Domain time factory outside normalizer');
      }
      if (
        !isNormalizer &&
        !isContractDeclaration &&
        (PROTECTED_TIME_FIELDS.has(token.value) ||
          token.value === 'localDateTime')
      ) {
        labels.add('Computed business time field outside normalizer');
      }
      if (
        !isNormalizer &&
        !isContractDeclaration &&
        token.value === 'dateTime'
      ) {
        labels.add('Computed raw API dateTime outside normalizer');
      }
      if (token.value.includes('Asia/Shanghai')) {
        labels.add('IANA business-time identifier');
      }
      if (token.value.includes('+08:00')) {
        hasBeijingOffsetText = true;
      }
      if (!isNormalizer && isTimeNormalizerInternalImport(token.value)) {
        labels.add('Time normalizer internal import');
      }
    }

    if (
      !isNormalizer &&
      token.kind === SyntaxKind.Identifier &&
      DOMAIN_TIME_FACTORIES.has(token.value)
    ) {
      labels.add('Domain time factory outside normalizer');
    }
  }

  if (runtimeClockReferences > 1) {
    labels.add('Multiple runtime clock references');
  }
  if (!isNormalizer) {
    for (const label of findDomainTimeImportViolations(tokens)) {
      labels.add(label);
    }
    for (const label of findCalendarAdapterImportViolations(tokens)) {
      labels.add(label);
    }
    if (hasNamedHourOffsetArithmetic(tokens)) {
      labels.add('Named fixed Beijing offset arithmetic outside normalizer');
    }
  }
  if (
    !isNormalizer &&
    DATE_TIME_PATTERN_SIGNAL.test(source) &&
    hasDateTimeParserInvocation
  ) {
    labels.add('Date-time parser outside normalizer');
  }
  if (!isNormalizer && !isContractDeclaration && hasBeijingOffsetText) {
    labels.add('Fixed Beijing literal outside normalizer');
  }
  if (
    !isNormalizer &&
    !isContractDeclaration &&
    source.includes('BeijingStandardTime+08:00')
  ) {
    labels.add('Calendar time standard literal outside normalizer');
  }
  if (!isNormalizer && hasPadStart && hasBeijingOffsetText) {
    labels.add('Date-time formatter outside normalizer');
  }
  if (!isNormalizer && !isContractDeclaration) {
    for (const fields of collectObjectFieldSets(tokens)) {
      if (fields.has('epochMilliseconds') && fields.has('offset')) {
        labels.add('Manual YunQiInstant construction outside normalizer');
      }
      if (
        fields.has('localDateTime') &&
        fields.has('calendarTimeStandard') &&
        fields.has('instant')
      ) {
        labels.add(
          'Manual YunQiCalendarTime construction outside normalizer',
        );
      }
    }
  }

  return [...labels];
}

export async function findTimePurityViolations(root = packageRoot) {
  const sourceRoot = resolve(root, 'src');
  const files = await collectTypeScriptFiles(sourceRoot);
  const violations = [];

  for (const file of files) {
    const relativePath = normalizePath(relative(root, file));
    const source = await readFile(file, 'utf8');
    for (const label of findFileViolations(relativePath, source)) {
      violations.push(`${relativePath}: ${label}`);
    }
  }

  return violations;
}

function readRootArgument(argv) {
  const index = argv.indexOf('--root');
  if (index === -1) return packageRoot;
  const value = argv[index + 1];
  if (!value) throw new Error('--root requires a path');
  return resolve(value);
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : '';

if (invokedPath === import.meta.url) {
  const violations = await findTimePurityViolations(
    readRootArgument(process.argv.slice(2)),
  );
  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(violation);
    }
    process.exitCode = 1;
  }
}
