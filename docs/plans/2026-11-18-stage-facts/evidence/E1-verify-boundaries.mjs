import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildMovementSteps,
  calculateLearning,
  calculateYearYunQi,
  calculateYunQi,
  createYunQiCalendarTime,
  formatYunQiInstant,
} from '../../../../packages/yunqi-domain/dist/index.js';
import { tyme4tsCalendarProvider as provider } from '../../../../packages/calendar-adapters/tyme4ts/dist/index.js';

const baseline = JSON.parse(readFileSync(new URL('./E1-boundary-baseline.json', import.meta.url), 'utf8'));
for (const expected of baseline.annualBoundaries) {
  const annual = calculateYearYunQi(expected.year, provider);
  const movements = buildMovementSteps(annual, provider);
  assert.deepEqual(
    [...movements.map((step) => step.start.epochMilliseconds), movements[4].end.epochMilliseconds],
    expected.movementEpochs,
    `${expected.year} movement boundary regression`,
  );
  assert.deepEqual(
    [...annual.steps.map((step) => step.start.epochMilliseconds), annual.end.epochMilliseconds],
    expected.qiEpochs,
    `${expected.year} qi boundary regression`,
  );
}

const input = createYunQiCalendarTime({ year: 2026, month: 11, day: 18, hour: 8, minute: 44, second: 0, millisecond: 0 });
const learning = calculateLearning(input, provider);
const compatibility = calculateYunQi(input.instant, provider);
assert.deepEqual(learning.facts.currentStepProgress, { elapsedRatio: 0.929, remainingCalendarDays: 4, endsOnInputDate: false });
assert.deepEqual(learning.currentMovementProgress, { elapsedRatio: 0.095, remainingCalendarDays: 63, endsOnInputDate: false });
assert.deepEqual(compatibility.currentStepProgress, learning.facts.currentStepProgress);
assert.deepEqual(learning.currentMovement.relation, {
  elementRelation: 'DIFFERENT_ELEMENT', direction: 'GUEST_GENERATES_HOST', traditionalLabel: '客运生主运',
});
assert.equal(learning.facts.currentStep.startTerm, '秋分');
assert.equal(learning.facts.currentStep.endTerm, '小雪');

console.log(JSON.stringify({
  baselineHead: baseline.head,
  provider: baseline.provider,
  annualRegressionCases: baseline.annualBoundaries.length,
  movementBoundarySlotsCompared: baseline.annualBoundaries.length * 6,
  qiBoundarySlotsCompared: baseline.annualBoundaries.length * 7,
  note: 'Repeated boundary slots are regression assertions, not independent astronomical or expert cases.',
  golden: {
    input: formatYunQiInstant(input.instant),
    qi: [learning.facts.currentStep.start, learning.facts.currentStep.end].map(formatYunQiInstant),
    qiProgress: learning.facts.currentStepProgress,
    movement: [learning.currentMovement.start, learning.currentMovement.end].map(formatYunQiInstant),
    movementProgress: learning.currentMovementProgress,
    movementRelation: learning.currentMovement.relation,
  },
}, null, 2));
