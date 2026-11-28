// Regenerate using the built TypeScript baseline. The runtime never reads these fixtures.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
const root = process.argv[2];
if (!root) throw new Error('Pass the baseline repository directory as the first argument');
const { resolveLunarBirthday, tyme4tsCalendarProvider } = await import(pathToFileURL(
  resolve(root, 'packages/calendar-adapters/tyme4ts/dist/index.js')).href);
const terms = ['大寒','春分','小满','芒种','大暑','处暑','秋分','立冬','小雪'];
const rows = [];
for (let year = 1900; year <= 2100; year++) {
  // Digest a stable UTF-8 line per query, including an empty line for no match.
  // Order, all candidate fields, regular/leap collisions and empty results contribute.
  let hash = 14695981039346656037n;
  let count = 0;
  for (let month=1; month<=12; month++) {
    for (let day=1; day<=31; day++) {
      const matches = resolveLunarBirthday(year,month,day);
      count += matches.length;
      const line = matches.map(x => x.birthDate + '/' + x.lunarLabel + '/' + (x.leap ? '1' : '0')).join('|');
      for (const byte of Buffer.from(line+'\n')) hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 1099511628211n);
    }
  }
  const epochs = terms.map(term => tyme4tsCalendarProvider.getSolarTermInstant(year,term).epochMilliseconds);
  rows.push([year, count, hash.toString(16).padStart(16,'0'), ...epochs].join(','));
}
const header = ['year','candidateCount','lunarFNV1a64',...terms].join(',');
writeFileSync(new URL('tyme4ts-1.5.2.csv', import.meta.url), [header,...rows,''].join('\n'));
