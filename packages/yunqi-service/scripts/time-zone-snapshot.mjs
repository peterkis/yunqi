import { tyme4tsCalendarProvider } from '@yunqi/calendar-adapter-tyme4ts';
import {
  buildApp,
  formatYunQiCalendarTime,
  normalizeApiDateTime,
} from '../dist/index.js';

const app = await buildApp({
  provider: tyme4tsCalendarProvider,
  now: () => 1_705_759_642_000,
  logger: false,
});

async function calculate(dateTime) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/yunqi/calculate',
    payload: { dateTime },
  });
  if (response.statusCode !== 200) {
    throw new Error(`${dateTime}: ${response.statusCode} ${response.body}`);
  }
  const data = response.json().data;
  return {
    input: data.input,
    year: data.year,
    step: data.currentStep.index,
  };
}

try {
  const normalizedInputs = [
    '2026-01-01T12:00:00',
    '2026-01-01T12:00:00+08:00',
    '2026-01-01T04:00:00Z',
  ];
  const dahanInputs = [
    '2024-01-20T22:07:21',
    '2024-01-20T14:07:22Z',
    '2024-01-20T22:07:23+08:00',
  ];
  const historicalInputs = [
    '1991-05-21T21:20:14',
    '1991-05-21T21:20:14+08:00',
    '1991-05-21T13:20:14Z',
    '1991-07-23T16:11:08',
    '1991-07-23T16:11:08+08:00',
    '1991-07-23T08:11:08Z',
  ];
  const currentResponse = await app.inject({
    method: 'GET',
    url: '/api/v1/yunqi/current',
  });
  if (currentResponse.statusCode !== 200) {
    throw new Error(`current: ${currentResponse.statusCode}`);
  }
  const current = currentResponse.json().data;

  process.stdout.write(
    JSON.stringify({
      environment: {
        requestedTimeZone: process.env.TZ ?? '',
        effectiveTimeZone:
          new Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      business: {
        normalized: normalizedInputs.map((input) => {
          const calendarTime = normalizeApiDateTime(input);
          return {
            input,
            calendarTime,
            dto: formatYunQiCalendarTime(calendarTime),
          };
        }),
        dahan: await Promise.all(dahanInputs.map(calculate)),
        historical: await Promise.all(historicalInputs.map(calculate)),
        current: {
          input: current.input,
          year: current.year,
          step: current.currentStep.index,
        },
      },
    }),
  );
} finally {
  await app.close();
}
