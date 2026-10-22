import { tyme4tsCalendarProvider } from '@yunqi/calendar-adapter-tyme4ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import {
  formatYunQiCalendarTime,
  normalizeEpochMilliseconds,
} from '../src/modules/time-normalizer/index.js';

const lowerBoundary = tyme4tsCalendarProvider
  .getSolarTermInstant(1900, '大寒').epochMilliseconds;
const upperBoundary = tyme4tsCalendarProvider
  .getSolarTermInstant(2101, '大寒').epochMilliseconds;

function equivalentInputs(epochMilliseconds: number): readonly string[] {
  const canonical = formatYunQiCalendarTime(
    normalizeEpochMilliseconds(epochMilliseconds),
  ).localTime;
  const utcFields = formatYunQiCalendarTime(
    normalizeEpochMilliseconds(epochMilliseconds - 8 * 60 * 60 * 1_000),
  ).localTime.slice(0, -6);

  return [canonical, canonical.slice(0, -6), `${utcFields}Z`];
}

describe('1900–2100 YunQi service range with the real calendar provider', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let currentEpoch = lowerBoundary;

  beforeEach(async () => {
    app = await buildApp({
      provider: tyme4tsCalendarProvider,
      now: () => currentEpoch,
      logger: false,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it.each([1900, 2100])('serves supported endpoint year %i', async (year) => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/yunqi/year/${year}`,
    });

    expect(response.statusCode).toBe(200);
    const data = response.json().data;
    expect(data.year).toBe(year);
    expect(data.ruleVersion).toBe('YQ-MVP-RULES-1.1.0');
    expect(data.sixQi.steps).toHaveLength(6);
    expect(data.interval.start.epochMilliseconds).toBe(
      tyme4tsCalendarProvider.getSolarTermInstant(year, '大寒')
        .epochMilliseconds,
    );
    expect(data.interval.end.epochMilliseconds).toBe(
      tyme4tsCalendarProvider.getSolarTermInstant(year + 1, '大寒')
        .epochMilliseconds,
    );
  });

  it.each([
    { name: 'before 1900 DaHan', epoch: lowerBoundary - 1, status: 400 },
    { name: 'at 1900 DaHan', epoch: lowerBoundary, status: 200, year: 1900, step: 1 },
    { name: 'after 1900 DaHan', epoch: lowerBoundary + 1, status: 200, year: 1900, step: 1 },
    { name: 'before 2101 DaHan', epoch: upperBoundary - 1, status: 200, year: 2100, step: 6 },
    { name: 'at 2101 DaHan', epoch: upperBoundary, status: 400 },
    { name: 'after 2101 DaHan', epoch: upperBoundary + 1, status: 400 },
  ])('keeps calculate/current ownership aligned $name', async (sample) => {
    currentEpoch = sample.epoch;
    const responses = [];
    for (const dateTime of equivalentInputs(sample.epoch)) {
      responses.push(await app.inject({
        method: 'POST',
        url: '/api/v1/yunqi/calculate',
        payload: { dateTime },
      }));
    }
    responses.push(await app.inject({
      method: 'GET',
      url: '/api/v1/yunqi/current',
    }));

    const expectedTime = formatYunQiCalendarTime(
      normalizeEpochMilliseconds(sample.epoch),
    );
    for (const response of responses) {
      expect(response.statusCode).toBe(sample.status);
      if (sample.status === 400) {
        expect(response.json().code).toBe('INVALID_ARGUMENT');
        continue;
      }

      const data = response.json().data;
      expect(data.year).toBe(sample.year);
      expect(data.ruleVersion).toBe('YQ-MVP-RULES-1.1.0');
      expect(data.currentStep.index).toBe(sample.step);
      expect(data.currentStep).toEqual(data.sixQi.steps[sample.step! - 1]);
      expect(data.input).toEqual(expectedTime);
      expect(data).toEqual(responses[0]!.json().data);
    }
  });

  it('preserves approved guest-generates-host wording through every business route', async () => {
    currentEpoch = tyme4tsCalendarProvider
      .getSolarTermInstant(2026, '大寒').epochMilliseconds;
    const annual = await app.inject({
      method: 'GET',
      url: '/api/v1/yunqi/year/2026',
    });
    const calculated = await app.inject({
      method: 'POST',
      url: '/api/v1/yunqi/calculate',
      payload: { dateTime: equivalentInputs(currentEpoch)[0] },
    });
    const current = await app.inject({
      method: 'GET',
      url: '/api/v1/yunqi/current',
    });

    for (const response of [annual, calculated, current]) {
      expect(response.statusCode).toBe(200);
      const data = response.json().data;
      expect(data.ruleVersion).toBe('YQ-MVP-RULES-1.1.0');
      expect(data.sixQi.steps[0]).toMatchObject({
        hostQi: '厥阴风木',
        guestQi: '太阳寒水',
        relation: {
          direction: 'GUEST_GENERATES_HOST',
          traditionalLabel: '客生主，相得',
        },
      });
    }
    expect(calculated.json().data.currentStep).toEqual(
      annual.json().data.sixQi.steps[0],
    );
    expect(current.json().data).toEqual(calculated.json().data);
  });
});

