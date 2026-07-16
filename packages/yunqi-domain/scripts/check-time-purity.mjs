import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  LanguageVariant,
  SyntaxKind,
  computeLineStarts,
  createScanner,
} from 'typescript/unstable/ast';

const PACKAGE_ROOT = path.resolve(import.meta.dirname, '..');
const DEFAULT_SCAN_ROOTS = ['src', 'tests'];
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);
const FORBIDDEN_IDENTIFIERS = new Map([
  ['Date', 'forbidden-date-api'],
  ['Temporal', 'forbidden-temporal-api'],
  ['Intl', 'forbidden-intl-api'],
]);
const FORBIDDEN_API_LITERALS = new Map([
  ['Date', 'forbidden-computed-date-api'],
  ['Temporal', 'forbidden-computed-temporal-api'],
  ['Intl', 'forbidden-computed-intl-api'],
]);
const IANA_ZONE_PATTERN =
  /^(?:Africa|America|Antarctica|Arctic|Asia|Atlantic|Australia|Europe|Indian|Pacific|Etc)\/[A-Za-z0-9_+.-]+(?:\/[A-Za-z0-9_+.-]+)*$/;
const TIME_ZONE_PACKAGE_PATTERN =
  /^(?:@js-temporal\/polyfill|moment-timezone|date-fns-tz|timezone-support|tzdata|luxon|js-joda-timezone)$/;

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(absolutePath)));
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(absolutePath);
    }
  }

  return files;
}

function lineAndColumn(lineStarts, position) {
  let low = 0;
  let high = lineStarts.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const start = lineStarts[middle];
    const next = lineStarts[middle + 1] ?? Number.POSITIVE_INFINITY;

    if (position < start) {
      high = middle - 1;
    } else if (position >= next) {
      low = middle + 1;
    } else {
      return { line: middle + 1, column: position - start + 1 };
    }
  }

  return { line: 1, column: 1 };
}

function scanSource(relativePath, sourceText) {
  const scanner = createScanner(true, LanguageVariant.Standard, sourceText);
  const lineStarts = computeLineStarts(sourceText);
  const findings = [];

  while (scanner.scan() !== SyntaxKind.EndOfFile) {
    const token = scanner.getToken();
    const start = scanner.getTokenStart();
    const value = scanner.getTokenValue();
    const identifierRule =
      token === SyntaxKind.Identifier
        ? FORBIDDEN_IDENTIFIERS.get(value)
        : undefined;

    if (identifierRule !== undefined) {
      findings.push({
        relativePath,
        ...lineAndColumn(lineStarts, start),
        rule: identifierRule,
        value,
      });
    }

    if (
      token === SyntaxKind.StringLiteral ||
      token === SyntaxKind.NoSubstitutionTemplateLiteral
    ) {
      const stringRule =
        FORBIDDEN_API_LITERALS.get(value) ??
        (IANA_ZONE_PATTERN.test(value)
          ? 'forbidden-iana-zone'
          : TIME_ZONE_PACKAGE_PATTERN.test(value)
            ? 'forbidden-time-zone-package'
            : undefined);

      if (stringRule !== undefined) {
        findings.push({
          relativePath,
          ...lineAndColumn(lineStarts, start),
          rule: stringRule,
          value,
        });
      }
    }
  }

  return findings;
}

const requestedRoots =
  process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_SCAN_ROOTS;
const scanRoots = requestedRoots.map((entry) =>
  path.resolve(PACKAGE_ROOT, entry),
);
const files = (
  await Promise.all(scanRoots.map((entry) => collectSourceFiles(entry)))
).flat();
const findings = [];

for (const file of files.sort()) {
  const sourceText = await readFile(file, 'utf8');
  findings.push(
    ...scanSource(path.relative(PACKAGE_ROOT, file).replaceAll('\\', '/'), sourceText),
  );
}

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(
      `${finding.relativePath}:${finding.line}:${finding.column} ${finding.rule} ${JSON.stringify(finding.value)}`,
    );
  }

  process.exitCode = 1;
} else {
  console.log(`Domain time purity passed for ${files.length} files.`);
}
