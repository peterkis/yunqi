// Rebuild the embedded HTTP bodies from a built reference workspace with locked dependencies.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const [original] = process.argv.slice(2);
if (!original) throw Error('Expected built original repository directory');
const load = path => import(pathToFileURL(resolve(original, path)).href);
const [{ buildApp }, { tyme4tsCalendarProvider: provider }] = await Promise.all([
  load('packages/yunqi-service/dist/app.js'),
  load('packages/calendar-adapters/tyme4ts/dist/index.js'),
]);
const app = await buildApp({ provider, now: () => 0 });
const dest = new URL('../assets/', import.meta.url);
const entries = [
  ['/docs', 'index.html'],
  ['/docs/', 'index-slash.html'],
  ['/docs/json', 'json'],
  ['/docs/yaml', 'yaml'],
];
for (const name of [
  'swagger-initializer.js', 'swagger-ui-bundle.js', 'swagger-ui-standalone-preset.js',
  'swagger-ui.js', 'swagger-ui.css', 'index.css', 'oauth2-redirect.js',
  'oauth2-redirect.html', 'favicon-16x16.png', 'favicon-32x32.png', 'logo.svg',
]) {
  const filename = /\.(?:css|js)$/.test(name) ? name + '.gz' : name;
  entries.push(['/docs/static/' + name, filename]);
}
try {
  await mkdir(dest, { recursive: true });
  for (const [url, filename] of entries) {
    const reply = await app.inject({ method: 'GET', url });
    if (reply.statusCode !== 200) throw Error(url + ' returned ' + reply.statusCode);
    const bytes = filename.endsWith('.gz') ? gzipSync(reply.rawPayload, { level: 9 }) : reply.rawPayload;
    await writeFile(new URL(filename, dest), bytes);
  }
} finally {
  await app.close();
}
