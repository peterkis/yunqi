const BUSINESS_PATHS = [
  '/api/v1/yunqi/year/{year}',
  '/api/v1/yunqi/current',
  '/api/v1/yunqi/calculate',
];

const HTTP_METHODS = new Set([
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
]);

const DOCUMENTATION_KEYS = new Set([
  'description',
  'example',
  'examples',
  'externalDocs',
  'summary',
  'tags',
]);
const NAMED_ENTRY_MAP_KEYS = new Set([
  '$defs',
  'callbacks',
  'content',
  'dependentSchemas',
  'headers',
  'paths',
  'patternProperties',
  'properties',
  'responses',
  'schemas',
]);

function compareJsonValues(left, right) {
  return JSON.stringify(left).localeCompare(JSON.stringify(right));
}

function canonicalize(value, parentKey) {
  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalize(item));

    if (parentKey === 'required' || parentKey === 'enum') {
      return items.sort(compareJsonValues);
    }

    return items;
  }

  if (typeof value !== 'object' || value === null) {
    return value;
  }

  const preservesEntryNames = NAMED_ENTRY_MAP_KEYS.has(parentKey);

  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key]) =>
          preservesEntryNames || !DOCUMENTATION_KEYS.has(key),
      )
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalize(child, key)]),
  );
}

function collectLocalReferences(value, references = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectLocalReferences(item, references);
    }
    return references;
  }

  if (typeof value !== 'object' || value === null) {
    return references;
  }

  for (const [key, child] of Object.entries(value)) {
    if (
      key === '$ref' &&
      typeof child === 'string' &&
      child.startsWith('#/')
    ) {
      references.add(child);
    } else {
      collectLocalReferences(child, references);
    }
  }

  return references;
}

function decodeJsonPointerSegment(value) {
  return value.replaceAll('~1', '/').replaceAll('~0', '~');
}

function resolveLocalReference(document, reference) {
  return reference
    .slice(2)
    .split('/')
    .map(decodeJsonPointerSegment)
    .reduce((current, segment) => current?.[segment], document);
}

function schemaNameFromReference(reference) {
  const prefix = '#/components/schemas/';
  return reference.startsWith(prefix)
    ? decodeJsonPointerSegment(reference.slice(prefix.length))
    : undefined;
}

function selectBusinessPaths(document) {
  const selected = {};

  for (const path of BUSINESS_PATHS) {
    const pathItem = document.paths?.[path];
    if (typeof pathItem !== 'object' || pathItem === null) {
      throw new Error(`OpenAPI business path missing: ${path}`);
    }

    const selectedPathItem = {};
    if (pathItem.parameters !== undefined) {
      selectedPathItem.parameters = pathItem.parameters;
    }

    for (const [key, operation] of Object.entries(pathItem)) {
      if (HTTP_METHODS.has(key) && operation !== undefined) {
        selectedPathItem[key] = operation;
      }
    }

    selected[path] = selectedPathItem;
  }

  return selected;
}

function collectReachableSchemas(document, selectedPaths) {
  const pending = [
    ...collectLocalReferences(selectedPaths),
  ];
  const visitedReferences = new Set();
  const schemaNames = new Set();

  while (pending.length > 0) {
    const reference = pending.pop();
    if (visitedReferences.has(reference)) continue;
    visitedReferences.add(reference);

    const target = resolveLocalReference(document, reference);
    if (target === undefined) {
      throw new Error(`Unresolved local OpenAPI reference: ${reference}`);
    }

    const schemaName = schemaNameFromReference(reference);
    if (schemaName !== undefined) {
      schemaNames.add(schemaName);
    }

    for (const nested of collectLocalReferences(target)) {
      if (!visitedReferences.has(nested)) {
        pending.push(nested);
      }
    }
  }

  return Object.fromEntries(
    [...schemaNames]
      .sort((left, right) => left.localeCompare(right))
      .map((name) => [name, document.components.schemas[name]]),
  );
}

export function createContractProjection(document) {
  const contractId = document?.['x-yunqi-contract-id'];
  const documentVersion = document?.info?.version;

  if (typeof contractId !== 'string' || contractId.length === 0) {
    throw new Error('OpenAPI x-yunqi-contract-id is required');
  }
  if (typeof document?.openapi !== 'string') {
    throw new Error('OpenAPI dialect is required');
  }
  if (typeof documentVersion !== 'string') {
    throw new Error('OpenAPI document version is required');
  }
  if (
    typeof document?.components?.schemas !== 'object' ||
    document.components.schemas === null
  ) {
    throw new Error('OpenAPI components.schemas is required');
  }

  const paths = selectBusinessPaths(document);
  const schemas = collectReachableSchemas(document, paths);

  return canonicalize({
    contractId,
    openapi: document.openapi,
    documentVersion,
    paths,
    schemas,
  });
}

export function serializeContractProjection(projection) {
  return `${JSON.stringify(canonicalize(projection), null, 2)}\n`;
}

export function assertFreezeMayBeWritten(
  existingProjection,
  currentProjection,
) {
  const existingId = existingProjection?.contractId;
  const currentId = currentProjection?.contractId;
  const changed =
    serializeContractProjection(existingProjection) !==
    serializeContractProjection(currentProjection);

  if (existingId !== currentId) {
    throw new Error(
      `Contract ID mismatch: baseline declares ${existingId} but current document declares ${currentId}`,
    );
  }

  if (changed) {
    throw new Error(
      `Contract ID ${currentId} is unchanged but its frozen projection changed`,
    );
  }
}

export function assertContractProjectionMatchesFreeze(
  frozenProjection,
  currentProjection,
) {
  if (
    serializeContractProjection(frozenProjection) !==
    serializeContractProjection(currentProjection)
  ) {
    throw new Error(
      `API contract ${currentProjection?.contractId} frozen projection changed`,
    );
  }
}

export function assertRegisteredContractBaselineState(
  registry,
  contractId,
  baselineExists,
) {
  if (
    !Array.isArray(registry?.contractIds) ||
    registry.contractIds.some(
      (value) => typeof value !== 'string' || value.length === 0,
    )
  ) {
    throw new Error('Contract registry must contain contractIds');
  }

  const registered = registry.contractIds.includes(contractId);

  if (registered && !baselineExists) {
    throw new Error(
      `Contract ID ${contractId} is registered but its baseline is missing`,
    );
  }
  if (!registered && baselineExists) {
    throw new Error(
      `Contract ID ${contractId} is unregistered but a baseline already exists`,
    );
  }

  return registered;
}

export function assertRegistryPreservesHistory(
  registry,
  historicalContractIds,
) {
  if (
    !Array.isArray(registry?.contractIds) ||
    registry.contractIds.some(
      (value) => typeof value !== 'string' || value.length === 0,
    )
  ) {
    throw new Error('Contract registry must contain contractIds');
  }
  if (
    !Array.isArray(historicalContractIds) ||
    historicalContractIds.some(
      (value) => typeof value !== 'string' || value.length === 0,
    )
  ) {
    throw new Error('Historical Contract IDs must be an array of strings');
  }

  const currentIds = new Set(registry.contractIds);
  for (const historicalContractId of new Set(historicalContractIds)) {
    if (!currentIds.has(historicalContractId)) {
      throw new Error(
        `Registry removed historical Contract ID ${historicalContractId}`,
      );
    }
  }
}

export function findRegistryBaselineViolations(
  registry,
  baselinesByFile,
) {
  const violations = [];

  if (
    !Array.isArray(registry?.contractIds) ||
    registry.contractIds.some(
      (value) => typeof value !== 'string' || value.length === 0,
    )
  ) {
    return ['Contract registry must contain contractIds'];
  }
  if (
    typeof baselinesByFile !== 'object' ||
    baselinesByFile === null ||
    Array.isArray(baselinesByFile)
  ) {
    return ['Contract baselines must be keyed by filename'];
  }

  const registeredIds = new Set(registry.contractIds);
  if (registeredIds.size !== registry.contractIds.length) {
    violations.push('Contract registry contains duplicate Contract IDs');
  }

  for (const contractId of registeredIds) {
    const filename = `${contractId}.freeze.json`;
    const baseline = baselinesByFile[filename];

    if (baseline === undefined) {
      violations.push(`${filename} is missing`);
      continue;
    }
    if (baseline?.contractId !== contractId) {
      violations.push(
        `${filename} embedded Contract ID ${baseline?.contractId} does not match ${contractId}`,
      );
    }
  }

  for (const filename of Object.keys(baselinesByFile)) {
    if (!filename.endsWith('.freeze.json')) continue;
    const contractId = filename.slice(0, -'.freeze.json'.length);
    if (!registeredIds.has(contractId)) {
      violations.push(
        `${filename} is an unregistered baseline`,
      );
    }
  }

  return violations;
}

export function findHistoricalBaselineContentViolations(
  currentBaselinesByFile,
  historicalBaselinesByFile,
) {
  const violations = [];

  for (
    const [filename, historicalBaseline]
    of Object.entries(historicalBaselinesByFile)
  ) {
    const currentBaseline = currentBaselinesByFile[filename];
    if (currentBaseline === undefined) continue;

    if (
      serializeContractProjection(currentBaseline) !==
      serializeContractProjection(historicalBaseline)
    ) {
      violations.push(
        `${filename} historical baseline content changed`,
      );
    }
  }

  return violations;
}

export { BUSINESS_PATHS };
