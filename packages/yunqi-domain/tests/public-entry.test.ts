import { describe, expect, it } from 'vitest';
import {
  BRANCH_QI_RULES,
  BEIJING_CALENDAR_TIME_STANDARD,
  BEIJING_STANDARD_OFFSET,
  ELEMENT_CONTROL_MAP,
  ELEMENT_GENERATION_MAP,
  GUEST_QI_SEQUENCE,
  HOST_GUEST_RELATION_PRIORITY,
  HOST_QI_SEQUENCE,
  QI_ELEMENT_MAP,
  RULE_VERSION,
  SIXTY_CYCLE,
  SIXTY_CYCLE_ANCHOR,
  STEM_RULES,
  STEP_BOUNDARY_TERMS,
  STEP_NAMES,
  calculateHostGuestRelation,
  calculateYunQiByCalendarTime,
  createYunQiCalendarTimeFromInstant,
  createYunQiInstant,
  type BeijingLocalDateTime,
  type BeijingStandardOffset,
  type CalendarTimeStandard,
  type Element,
  type ElementRelation,
  type HostGuestDirection,
  type HostGuestRelationResult,
  type Qi,
  type QiRelation,
  type SolarTerm,
  type YunQiInstant,
  type YunQiCalendarResult,
  type YunQiCalendarTime,
} from '../src/index.js';

function compileTimeOnlyRelationContract(relation: HostGuestRelationResult): void {
  const qiRelation: QiRelation = relation.qiRelation;
  const elementRelation: ElementRelation = relation.elementRelation;
  const direction: HostGuestDirection = relation.direction;
  void { qiRelation, elementRelation, direction };

  // @ts-expect-error Structured relation fields are readonly.
  relation.direction = 'NONE';
}

void compileTimeOnlyRelationContract;

describe('package source entrypoint', () => {
  it('re-exports public types and immutable runtime rule constants', () => {
    const element: Element = QI_ELEMENT_MAP['厥阴风木'];
    const qi: Qi = HOST_QI_SEQUENCE[0];
    const relation: HostGuestRelationResult = calculateHostGuestRelation(
      '厥阴风木',
      '少阴君火',
    );
    const term: SolarTerm = STEP_BOUNDARY_TERMS[0];
    const instant: YunQiInstant = createYunQiInstant(1_705_759_642_000);
    const calendarTime: YunQiCalendarTime =
      createYunQiCalendarTimeFromInstant(instant);
    const localDateTime: BeijingLocalDateTime = calendarTime.localDateTime;
    const offset: BeijingStandardOffset = BEIJING_STANDARD_OFFSET;
    const standard: CalendarTimeStandard = BEIJING_CALENDAR_TIME_STANDARD;
    const calendarContracts = {
      calculateYunQiByCalendarTime,
      localDateTime,
      offset,
      standard,
    } satisfies {
      calculateYunQiByCalendarTime: typeof calculateYunQiByCalendarTime;
      localDateTime: BeijingLocalDateTime;
      offset: BeijingStandardOffset;
      standard: CalendarTimeStandard;
    };
    void calendarContracts;
    type CalendarResultContract = YunQiCalendarResult;
    void (undefined as unknown as CalendarResultContract);

    expect({ element, qi, relation, term, instant }).toEqual({
      element: '木',
      qi: '厥阴风木',
      relation: {
        qiRelation: 'DIFFERENT_QI',
        elementRelation: 'DIFFERENT_ELEMENT',
        direction: 'HOST_GENERATES_GUEST',
        traditionalLabel: '主生客，相得',
      },
      term: '大寒',
      instant: {
        epochMilliseconds: 1_705_759_642_000,
        offset: '+08:00',
      },
    });
    expect(Object.isFrozen(relation)).toBe(true);
    expect(HOST_GUEST_RELATION_PRIORITY[0]).toBe('SAME_QI');
    expect(RULE_VERSION).toBe('YQ-MVP-RULES-1.0.0');
    expect(SIXTY_CYCLE_ANCHOR.year).toBe(1984);
    expect(SIXTY_CYCLE[0]).toBe('甲子');
    expect(STEM_RULES.甲.tone).toBe('太宫');
    expect(BRANCH_QI_RULES.子.sitian).toBe('少阴君火');
    expect(GUEST_QI_SEQUENCE[2]).toBe('太阴湿土');
    expect(STEP_NAMES[0]).toBe('初之气');
    expect(STEP_BOUNDARY_TERMS[0]).toBe('大寒');
    expect(ELEMENT_GENERATION_MAP.木).toBe('火');
    expect(ELEMENT_CONTROL_MAP.木).toBe('土');
    expect([
      SIXTY_CYCLE,
      STEM_RULES,
      BRANCH_QI_RULES,
      HOST_QI_SEQUENCE,
      GUEST_QI_SEQUENCE,
      STEP_NAMES,
      STEP_BOUNDARY_TERMS,
      QI_ELEMENT_MAP,
      ELEMENT_GENERATION_MAP,
      ELEMENT_CONTROL_MAP,
      HOST_GUEST_RELATION_PRIORITY,
    ].every(Object.isFrozen)).toBe(true);
  });
});
