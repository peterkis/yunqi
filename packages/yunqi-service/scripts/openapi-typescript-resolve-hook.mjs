let typescriptUrl;

export function initialize(data) {
  if (typeof data?.typescriptUrl !== 'string') {
    throw new TypeError('A TypeScript compatibility module URL is required');
  }

  typescriptUrl = data.typescriptUrl;
}

export function resolve(specifier, context, nextResolve) {
  if (
    specifier === 'typescript'
    && context.parentURL?.includes('/node_modules/openapi-typescript/')
  ) {
    return {
      url: typescriptUrl,
      shortCircuit: true,
    };
  }

  return nextResolve(specifier, context);
}
