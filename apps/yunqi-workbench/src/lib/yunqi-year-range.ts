export const YUNQI_YEAR_RANGE = {
  min: 1901,
  max: 2099,
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
