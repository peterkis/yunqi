import { register } from 'node:module';

register(
  new URL('./openapi-typescript-resolve-hook.mjs', import.meta.url),
  {
    parentURL: import.meta.url,
    data: {
      typescriptUrl: import.meta.resolve('openapi-typescript-ts'),
    },
  },
);

const packageJsonUrl = import.meta.resolve(
  'openapi-typescript/package.json',
);
const cliUrl = new URL('./bin/cli.js', packageJsonUrl);

await import(cliUrl.href);
