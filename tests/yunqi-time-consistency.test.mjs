import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateYearYunQi,
  calculateYunQiByCalendarTime,
  createYunQiCalendarTimeFromInstant,
  createYunQiInstant,
  formatYunQiCalendarTime,
} from '../packages/yunqi-domain/dist/index.js';
import {
  tyme4tsCalendarProvider,
} from '../packages/calendar-adapters/tyme4ts/dist/index.js';
import {
  buildApp,
  normalizeApiDateTime,
} from '../packages/yunqi-service/dist/index.js';

// Frozen Service range: YQ-API-CONTRACT-1.1.0. These explicit expectations
// must not be imported from implementation constants under test.
const FIRST_SUPPORTED_YEAR = 1900;
const LAST_SUPPORTED_YEAR = 2100;
const FIXED_BEIJING_OFFSET_MS = 28_800_000;
const BOUNDARY_TERMS = ['大寒', '春分', '小满', '大暑', '秋分', '小雪'];

function timeAt(epochMilliseconds) {
  return createYunQiCalendarTimeFromInstant(
    createYunQiInstant(epochMilliseconds),
  );
}

function equivalentInputForms(calendarTime) {
  const offset = formatYunQiCalendarTime(calendarTime);

  // Transport equivalence only: projecting (epoch - 8h) through the public
  // fixed-offset converter yields the UTC written fields. This is not an
  // independent Gregorian oracle or a year/step ownership calculation.
  const utcFields = timeAt(
    calendarTime.instant.epochMilliseconds - FIXED_BEIJING_OFFSET_MS,
  );
  const utc = `${formatYunQiCalendarTime(utcFields).slice(0, -6)}Z`;
  return [offset.slice(0, -6), offset, utc];
}

test('all 201 supported years preserve seven real boundaries at -1/0/+1 ms and three input forms', () => {
  let checkedYears = 0;
  let checkedBoundaryInstants = 0;
  let checkedInputForms = 0;

  for (let year = FIRST_SUPPORTED_YEAR; year <= LAST_SUPPORTED_YEAR; year += 1) {
    const annual = calculateYearYunQi(year, tyme4tsCalendarProvider);
    const boundaries = [
      ...BOUNDARY_TERMS.map((term) =>
        tyme4tsCalendarProvider.getSolarTermInstant(year, term)),
      tyme4tsCalendarProvider.getSolarTermInstant(year + 1, '大寒'),
    ];

    assert.equal(annual.steps.length, 6, `${year}: six steps`);
    assert.equal(annual.steps[2].guestQi, annual.sitian, `${year}: third guest qi`);
    assert.equal(annual.steps[5].guestQi, annual.zaiquan, `${year}: last guest qi`);
    assert.deepEqual(annual.start, boundaries[0], `${year}: annual start`);
    assert.deepEqual(annual.end, boundaries[6], `${year}: annual end`);

    for (let index = 0; index < 6; index += 1) {
      const step = annual.steps[index];
      assert.deepEqual(step.start, boundaries[index], `${year}: step ${index + 1} start`);
      assert.deepEqual(step.end, boundaries[index + 1], `${year}: step ${index + 1} end`);
      assert.ok(step.start.epochMilliseconds < step.end.epochMilliseconds);
    }

    for (let boundaryIndex = 0; boundaryIndex < 7; boundaryIndex += 1) {
      for (const deltaMs of [-1, 0, 1]) {
        const input = timeAt(boundaries[boundaryIndex].epochMilliseconds + deltaMs);
        const label = `${year}: boundary ${boundaryIndex}, delta ${deltaMs} ms`;

        // Independent ownership expectations come from the documented ordered
        // boundary position, never from another product resolver/result.
        let expectedYear = year;
        let expectedStep = deltaMs < 0 ? boundaryIndex : boundaryIndex + 1;
        if (boundaryIndex === 0) {
          if (deltaMs < 0) expectedYear = year - 1;
          expectedStep = deltaMs < 0 ? 6 : 1;
        } else if (boundaryIndex === 6) {
          if (deltaMs >= 0) expectedYear = year + 1;
          expectedStep = deltaMs < 0 ? 6 : 1;
        }
        const result = calculateYunQiByCalendarTime(input, tyme4tsCalendarProvider);

        assert.deepEqual([result.year, result.currentStep.index], [expectedYear, expectedStep], label);
        assert.equal(result.steps.filter((step) =>
          step.start.epochMilliseconds <= input.instant.epochMilliseconds &&
          input.instant.epochMilliseconds < step.end.epochMilliseconds).length, 1, label);

        for (const form of equivalentInputForms(input)) {
          assert.deepEqual(normalizeApiDateTime(form), input, `${label}: ${form}`);
          checkedInputForms += 1;
        }
        checkedBoundaryInstants += 1;
      }
    }
    checkedYears += 1;
  }

  assert.equal(checkedYears, 201);
  assert.equal(checkedBoundaryInstants, 4_221);
  assert.equal(checkedInputForms, 12_663);
});

test('Service accepts precisely 1900-2100 YunQi years at the 1900 and 2101 Dahan endpoints', async () => {
  const app = await buildApp({ provider: tyme4tsCalendarProvider, logger: false });
  let checkedRequests = 0;

  try {
    for (const year of [FIRST_SUPPORTED_YEAR, LAST_SUPPORTED_YEAR + 1]) {
      const boundary = tyme4tsCalendarProvider.getSolarTermInstant(year, '大寒');

      for (const deltaMs of [-1, 0, 1]) {
        const supported = year === FIRST_SUPPORTED_YEAR ? deltaMs >= 0 : deltaMs < 0;
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/yunqi/calculate',
          payload: {
            dateTime: formatYunQiCalendarTime(timeAt(boundary.epochMilliseconds + deltaMs)),
          },
        });
        const body = response.json();
        const label = `${year} Dahan, delta ${deltaMs} ms`;

        assert.equal(response.statusCode, supported ? 200 : 400, label);
        assert.equal(body.code, supported ? 'SUCCESS' : 'INVALID_ARGUMENT', label);
        if (supported) {
          assert.deepEqual(
            [body.data.year, body.data.currentStep.index],
            year === FIRST_SUPPORTED_YEAR ? [1900, 1] : [2100, 6],
            label,
          );
        }
        checkedRequests += 1;
      }
    }
    assert.equal(checkedRequests, 6);
  } finally {
    await app.close();
  }
});

test('normalization preserves Gregorian century rules, milliseconds, and strict input syntax', () => {
  assert.deepEqual(
    normalizeApiDateTime('2000-02-28T16:00:00.001Z'),
    normalizeApiDateTime('2000-02-29T00:00:00.001+08:00'),
  );
  assert.equal(
    formatYunQiCalendarTime(normalizeApiDateTime('2000-02-29T23:59:59.999')),
    '2000-02-29T23:59:59.999+08:00',
  );

  for (const input of [
    '1900-02-29T00:00:00',
    '2100-02-29T00:00:00',
    '2024-01-20T22:07:22.1',
    '2024-01-20T22:07:22.12',
    '2024-01-20T22:07:22.1234',
    '2024-01-20T22:07:22+09:00',
    '2024-01-20T22:07:22+0800',
    '2024-01-20 22:07:22',
    '2024-01-20T22:07:22+08:00\n',
  ]) {
    assert.throws(() => normalizeApiDateTime(input), { name: 'InvalidArgumentError' }, input);
  }
});
