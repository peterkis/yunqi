import assert from 'node:assert/strict';
import { buildApp } from '../../../../packages/yunqi-service/dist/index.js';
import { tyme4tsCalendarProvider } from '../../../../packages/calendar-adapters/tyme4ts/dist/index.js';

// Validate browser-scenario inputs against the built Service and real adapter.
// This is an HTTP-injection check, not browser/CSS or expert validation.
const app = await buildApp({ provider: tyme4tsCalendarProvider, logger: false,
  now: () => { throw new Error('Submitted calculations must not read the system clock'); },
});
try {
  for (const [dateTime, sameDay] of [
    ['2026-11-18T08:44:00+08:00', 'neither'],
    ['2026-11-22T00:00:00+08:00', 'qi'],
    ['2027-01-20T00:00:00+08:00', 'both'],
  ]) {
    const response = await app.inject({ method: 'POST', url: '/api/v1/yunqi/learning/calculate', payload: { dateTime } });
    assert.equal(response.statusCode, 200);
    const { data } = response.json();
    assert.equal(data.facts.input.localTime, dateTime);
    const qi = data.facts.currentStepProgress;
    const movement = data.currentMovementProgress;
    if (sameDay === 'neither') {
      assert.deepEqual(qi, { elapsedRatio: 0.929, remainingCalendarDays: 4, endsOnInputDate: false });
      assert.deepEqual(movement, { elapsedRatio: 0.095, remainingCalendarDays: 63, endsOnInputDate: false });
      assert.equal(data.currentMovement.relation.traditionalLabel, '客运生主运');
    } else {
      assert.equal(qi.remainingCalendarDays, 0);
      assert.equal(qi.endsOnInputDate, true);
      if (sameDay === 'both') {
        assert.equal(movement.remainingCalendarDays, 0);
        assert.equal(movement.endsOnInputDate, true);
      } else assert.ok(movement.remainingCalendarDays > 0);
    }
    console.log(JSON.stringify({ input: dateTime, qi, movement }));
  }
} finally {
  await app.close();
}
