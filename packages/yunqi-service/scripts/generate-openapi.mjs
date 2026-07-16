import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tyme4tsCalendarProvider } from '@yunqi/calendar-adapter-tyme4ts';
import { buildApp } from '../dist/app.js';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultOutput = resolve(
  packageRoot,
  'openapi/yunqi-service.openapi.yaml',
);

export async function generateOpenApi(outputPath = defaultOutput) {
  const app = await buildApp({
    provider: tyme4tsCalendarProvider,
    now: Date.now,
    logger: false,
  });

  try {
    await app.ready();
    const yaml = app.swagger({ yaml: true }).replace(/\r\n/g, '\n');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(
      outputPath,
      yaml.endsWith('\n') ? yaml : `${yaml}\n`,
      'utf8',
    );
  } finally {
    await app.close();
  }
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : '';

if (invokedPath === import.meta.url) {
  await generateOpenApi(process.argv[2] ?? defaultOutput);
}
