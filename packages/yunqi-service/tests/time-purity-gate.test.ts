import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const script = fileURLToPath(
  new URL('../scripts/check-time-purity.mjs', import.meta.url),
);

function createFixture(relativePath: string, source: string): string {
  const root = mkdtempSync(join(tmpdir(), 'yunqi-service-time-purity-'));
  const target = join(root, relativePath);
  mkdirSync(join(target, '..'), { recursive: true });
  writeFileSync(target, source, 'utf8');
  return root;
}

describe('Service business-time purity gate', () => {
  it.each([
    ['new Date', 'export const value = new Date();'],
    ['new Date without parentheses', 'export const value = new Date;'],
    [
      'Date alias',
      'const Clock = Date; export const value = new Clock();',
    ],
    ['Date.parse', 'export const value = Date.parse("2026-01-01");'],
    ['toISOString', 'export const value = input.toISOString();'],
    ['Temporal', 'export const value = Temporal.Instant.from("x");'],
    ['Intl', 'export const value = new Intl.DateTimeFormat();'],
    ['computed Date', "export const value = globalThis['Date'];"],
    ['computed Temporal', "export const value = globalThis['Temporal'];"],
    ['computed Intl', "export const value = globalThis['Intl'];"],
    ['IANA identifier', 'export const value = "Asia/Shanghai";'],
    [
      'Domain time factory outside normalizer',
      "import { createYunQiInstant } from '@yunqi/domain';",
    ],
    [
      'computed Domain time factory outside normalizer',
      "import * as domain from '@yunqi/domain'; export const value = domain['createYunQiInstant'](0);",
    ],
    [
      'Domain time formatter outside normalizer',
      "import { formatYunQiCalendarTime } from '@yunqi/domain'; export const value = formatYunQiCalendarTime(input);",
    ],
    [
      'calendar-adapter input conversion',
      "import { toYunQiInstant } from '@yunqi/calendar-adapter-tyme4ts'; export const value = toYunQiInstant('1991-05-21T08:00:00Z');",
    ],
    [
      'calendar-adapter namespace conversion',
      "import * as calendar from '@yunqi/calendar-adapter-tyme4ts'; export const value = calendar.toYunQiInstant('1991-05-21T08:00:00Z');",
    ],
    [
      'time-normalizer internal import',
      "import { parseApiDateTime } from '../modules/time-normalizer/parser.js';",
    ],
    [
      'date-time parser implementation',
      String.raw`const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/; export const parse = (value: string) => pattern.exec(value);`,
    ],
    [
      'date-time parser test implementation',
      String.raw`const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/; export const parse = (value: string) => pattern.test(value);`,
    ],
    [
      'alternate digit date-time parser implementation',
      String.raw`const pattern = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}$/; export const parse = (value: string) => pattern.test(value);`,
    ],
    [
      'date-time formatter implementation',
      "const pad = (value: number) => String(value).padStart(2, '0'); export const format = (hour: number) => `${pad(hour)}:00:00+08:00`;",
    ],
    [
      'fixed-offset arithmetic',
      'export const epoch = input.epochMilliseconds + 8 * 60 * 60 * 1_000;',
    ],
    [
      'fixed-offset literal',
      'export const epoch = input.epochMilliseconds + 28_800_000;',
    ],
    [
      'parenthesized fixed-offset arithmetic',
      'export const shift = (value: number) => value + 8 * (60 * 60 * 1_000);',
    ],
    [
      'named-hour fixed-offset arithmetic',
      'const HOUR = 3_600_000; export const shift = (value: number) => value + 8 * HOUR;',
    ],
    [
      'manually constructed YunQiInstant',
      "export const instant = { epochMilliseconds: 0, offset: '+08:00' };",
    ],
    [
      'manually constructed YunQiCalendarTime',
      "export const calendarTime = { localDateTime, calendarTimeStandard: 'BeijingStandardTime+08:00', instant };",
    ],
    [
      'computed manual YunQiInstant',
      "export const instant = { ['epochMilliseconds']: 0, ['offset']: '+08:00' };",
    ],
    [
      'Object.assign manual YunQiInstant',
      "export const instant = Object.assign({}, { epochMilliseconds: 0 }, { offset: '+08:00' });",
    ],
    [
      'raw dateTime access outside normalizer call',
      'export const raw = request.body.dateTime;',
    ],
  ])('detects forbidden %s conversion outside the normalizer', (_name, source) => {
    const root = createFixture('src/routes/example.ts', source);
    const result = spawnSync(
      process.execPath,
      [script, '--root', root],
      { encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('src/routes/example.ts');
  });

  it('permits only Date.now in the runtime server composition', () => {
    const root = createFixture(
      'src/server.ts',
      'export const options = { now: Date.now };',
    );

    expect(() =>
      execFileSync(process.execPath, [script, '--root', root]),
    ).not.toThrow();
  });

  it.each([
    [
      'invoked Date.now',
      'export const currentEpochMilliseconds = Date.now();',
    ],
    [
      'Date.now under a different property',
      'export const options = { clock: Date.now };',
    ],
    [
      'aliased Date',
      'const RuntimeDate = Date; export const options = { now: RuntimeDate.now };',
    ],
    [
      'multiple runtime clock references',
      'export const options = { now: Date.now }; export const duplicate = { now: Date.now };',
    ],
    [
      'optional-chained runtime clock',
      'export const options = { now: Date?.now };',
    ],
  ])('rejects %s in the runtime server composition', (_name, source) => {
    const root = createFixture('src/server.ts', source);
    const result = spawnSync(
      process.execPath,
      [script, '--root', root],
      { encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('src/server.ts');
  });

  it('permits consumers to import only the stable time-normalizer entry', () => {
    const root = createFixture(
      'src/routes/example.ts',
      "import { normalizeApiDateTime } from '../modules/time-normalizer/index.js';",
    );

    expect(() =>
      execFileSync(process.execPath, [script, '--root', root]),
    ).not.toThrow();
  });

  it('permits raw request dateTime only through the stable normalizer binding', () => {
    const root = createFixture(
      'src/routes/yunqi.ts',
      "import { normalizeApiDateTime } from '../modules/time-normalizer/index.js'; export const value = normalizeApiDateTime(request.body.dateTime);",
    );

    expect(() =>
      execFileSync(process.execPath, [script, '--root', root]),
    ).not.toThrow();
  });

  it.each([
    [
      'a local same-name parser',
      "function normalizeApiDateTime(value: string) { return value.slice(0, 19); } export const result = normalizeApiDateTime(request.body.dateTime);",
    ],
    [
      'a fake same-name import',
      "import { normalizeApiDateTime } from '../services/fake-normalizer.js'; export const result = normalizeApiDateTime(request.body.dateTime);",
    ],
    [
      'an adapter alias',
      "import { toYunQiInstant as normalizeApiDateTime } from '@yunqi/calendar-adapter-tyme4ts'; export const result = normalizeApiDateTime(request.body.dateTime);",
    ],
  ])('rejects raw request dateTime through %s', (_name, source) => {
    const root = createFixture('src/routes/yunqi.ts', source);
    const result = spawnSync(
      process.execPath,
      [script, '--root', root],
      { encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('src/routes/yunqi.ts');
  });

  it('rejects manual CalendarTime construction in any handwritten source module', () => {
    const root = createFixture(
      'src/time-helper.ts',
      "export const calendarTime = { localDateTime, calendarTimeStandard: 'BeijingStandardTime+08:00', instant };",
    );
    const result = spawnSync(
      process.execPath,
      [script, '--root', root],
      { encoding: 'utf8' },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('src/time-helper.ts');
  });

  it('permits Domain time factories only inside the normalizer module', () => {
    const root = createFixture(
      'src/modules/time-normalizer/normalizer.ts',
      "import { createYunQiInstant } from '@yunqi/domain';",
    );

    expect(() =>
      execFileSync(process.execPath, [script, '--root', root]),
    ).not.toThrow();
  });

  it('passes against the production Service source tree', () => {
    expect(() => execFileSync(process.execPath, [script])).not.toThrow();
  });
});
