export const YUNQI_YEAR_RANGE = {
  min: 1900,
  max: 2100,
} as const;

function createYearOptions(): readonly number[] {
  const values: number[] = [];
  for (
    let year = YUNQI_YEAR_RANGE.min;
    year <= YUNQI_YEAR_RANGE.max;
    year += 1
  ) {
    values.push(year);
  }
  return Object.freeze(values);
}

export const YUNQI_YEAR_OPTIONS = createYearOptions();
