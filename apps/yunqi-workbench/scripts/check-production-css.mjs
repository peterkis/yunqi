import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);
const stylesheets = (await readdir(dist, { recursive: true })).filter(file => file.endsWith('.css'));
assert.ok(stylesheets.length > 0, 'Production build must emit CSS');
for (const file of stylesheets) {
  const css = await readFile(new URL(file, dist), 'utf8');
  assert.doesNotMatch(css, /workbench-dev-host/, `Development host styles leaked into ${file}`);
}
console.log(`Production CSS checked: ${stylesheets.length} stylesheet(s), no development host rules.`);
