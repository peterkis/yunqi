import { expect, it } from 'vitest';
import { createLearningDto } from '../../../test/learning-fixtures';
import { currentRuleNotes } from './current-rule-notes';
import { mapLearning } from './map-learning';

it('separates the two supplied versions and preserves additional or revised explanations', () => {
  const dto = createLearningDto();
  const fact = `三之气客气与司天同为${dto.facts.sixQi.sitian}。`;
  const qualified = fact + '此条附有核对说明。';
  const learning = mapLearning({ ...dto, ruleVersion: 'YQ-LEARNING-RULES-2.0.1',
    facts: { ...dto.facts, explanations: [fact, qualified] },
    notes: ['经典摘录数据版本：YQ-CLASSICAL-READING-3.4.5。校勘说明。', '补充口径。'] });
  const notes = currentRuleNotes(learning);
  expect(notes.versions).toEqual([
    { name: '规则引擎', id: 'YQ-LEARNING-RULES-2.0.1', label: 'v2.0.1' },
    { name: '典籍数据', id: 'YQ-CLASSICAL-READING-3.4.5', label: 'v3.4.5' },
  ]);
  expect(notes.readingNote).toBe('校勘说明。');
  expect(notes.extra).toEqual([qualified, '补充口径。']);
});
