import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  calculateGuestQi,
  calculateHostGuestRelation,
  calculateStemBranch,
  calculateSuiYun,
  calculateYearYunQi,
  getHostQi,
  getSitianZaiquan,
} from '../packages/yunqi-domain/dist/index.js';
import {
  tyme4tsCalendarProvider,
} from '../packages/calendar-adapters/tyme4ts/dist/index.js';

// Read the tracked implementation baseline, never the untracked original
// review package. Passing proves engineering parity, not expert rule approval.
const ruleDocument = readFileSync(
  new URL('../rules/PHASE1_IMPLEMENTATION_RULES_V1_1.md', import.meta.url),
  'utf8',
).replaceAll('\r\n', '\n');

function section(heading) {
  const marker = `${heading}\n`;
  const start = ruleDocument.indexOf(marker);
  assert.notEqual(start, -1, `Missing rule section: ${heading}`);
  const level = heading.match(/^#+/)[0].length;
  const content = ruleDocument.slice(start + marker.length);
  const end = content.search(new RegExp(`^#{1,${level}} `, 'm'));
  return end === -1 ? content : content.slice(0, end);
}

function tableRows(heading) {
  return section(heading).split('\n')
    .filter((line) => line.startsWith('|'))
    .slice(2)
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
}

function cycleIn(heading) {
  const match = section(heading).match(/```text\n([^`]+)```/);
  assert.ok(match, `Missing rule sequence: ${heading}`);
  return match[1].trim().split(/\s*→\s*|\s+/);
}

function elementCycle(label) {
  const match = section('## 客主关系').match(new RegExp(`${label}：\x60([^\x60]+)\x60`));
  assert.ok(match, `Missing element cycle: ${label}`);
  const values = match[1].split('→');
  assert.equal(values[0], values.at(-1), `${label} must form a closed cycle`);
  assert.equal(values.length, 6);
  return Object.fromEntries(values.slice(0, -1).map((value, index) => [value, values[index + 1]]));
}

const specification = {
  version: ruleDocument.match(/规则版本：`([^`]+)`/)[1],
  anchor: Number(section('## 六十甲子').match(/运气年 `(\d+)`/)[1]),
  cycle: cycleIn('## 六十甲子'),
  stems: Object.fromEntries(tableRows('## 十干化运、太过不及与五音').map(
    ([stem, element, state, tone]) => [stem, { element, state, tone }],
  )),
  branches: Object.fromEntries(tableRows('## 年支定司天与在泉').flatMap(
    ([branches, sitian, zaiquan]) => branches.split('、').map((branch) => [branch, { sitian, zaiquan }]),
  )),
  hostSteps: tableRows('### 固定主气').map(([name, hostQi, startTerm]) => ({ name, hostQi, startTerm })),
  guestCycle: cycleIn('### 客气序列'),
  qiElements: Object.fromEntries(tableRows('## 客主关系')),
  generates: elementCycle('五行相生'),
  controls: elementCycle('五行相克'),
  priority: [...section('## 客主关系').matchAll(/^\d+\. [^\n]*`([A-Z_]+)`/gm)].map((match) => match[1]),
  labels: Object.fromEntries(tableRows('## 客主关系输出标签')),
};

// Independently hand-audited matrix. Rows are host Qi; columns are guest Qi.
// S = same Qi; F = different fire Qi; HG/GG = host/guest generates;
// HC/GC = host/guest controls. Do not derive this matrix from runtime tables.
const qiOrder = ['厥阴风木', '少阴君火', '太阴湿土', '少阳相火', '阳明燥金', '太阳寒水'];
const relationMatrix = [
  ['S',  'HG', 'HC', 'HG', 'GC', 'GG'],
  ['GG', 'S',  'HG', 'F',  'HC', 'GC'],
  ['GC', 'GG', 'S',  'GG', 'HG', 'HC'],
  ['GG', 'F',  'HG', 'S',  'HC', 'GC'],
  ['HC', 'GC', 'GG', 'GC', 'S',  'HG'],
  ['HG', 'HC', 'GC', 'HC', 'GG', 'S'],
];
const relationRules = {
  S: 'SAME_QI',
  F: 'SAME_ELEMENT_DIFFERENT_QI',
  HG: 'HOST_GENERATES_GUEST',
  GG: 'GUEST_GENERATES_HOST',
  HC: 'HOST_CONTROLS_GUEST',
  GC: 'GUEST_CONTROLS_HOST',
};
const relationLabels = {
  S: '同气',
  F: '同属火，六气不同',
  HG: '主生客，相得',
  GG: '客生主，相得',
  HC: '主克客',
  GC: '客克主',
};

function expectedRelation(host, guest) {
  const code = relationMatrix[qiOrder.indexOf(host)][qiOrder.indexOf(guest)];
  return {
    qiRelation: code === 'S' ? 'SAME_QI' : 'DIFFERENT_QI',
    elementRelation: ['S', 'F'].includes(code) ? 'SAME_ELEMENT' : 'DIFFERENT_ELEMENT',
    direction: ['S', 'F'].includes(code) ? 'NONE' : relationRules[code],
    traditionalLabel: relationLabels[code],
  };
}

function assertRelation(host, guest, actual) {
  assert.deepEqual(actual, expectedRelation(host, guest), `${host} / ${guest}`);
}

function documentRelation(host, guest) {
  const hostElement = specification.qiElements[host];
  const guestElement = specification.qiElements[guest];
  const matches = {
    SAME_QI: host === guest,
    SAME_ELEMENT_DIFFERENT_QI: host !== guest && hostElement === guestElement,
    HOST_GENERATES_GUEST: specification.generates[hostElement] === guestElement,
    GUEST_GENERATES_HOST: specification.generates[guestElement] === hostElement,
    HOST_CONTROLS_GUEST: specification.controls[hostElement] === guestElement,
    GUEST_CONTROLS_HOST: specification.controls[guestElement] === hostElement,
  };
  return specification.priority.find((rule) => matches[rule]);
}

test('tracked rule document supplies complete, distinct baseline tables', () => {
  assert.equal(specification.cycle.length, 60);
  assert.equal(new Set(specification.cycle).size, 60);
  assert.equal(Object.keys(specification.stems).length, 10);
  assert.equal(Object.keys(specification.branches).length, 12);
  assert.equal(specification.hostSteps.length, 6);
  assert.deepEqual(specification.guestCycle, qiOrder);
  assert.deepEqual(Object.keys(specification.qiElements), qiOrder);
  assert.deepEqual(specification.priority, Object.values(relationRules));
  assert.deepEqual(Object.keys(specification.labels), Object.values(relationRules));
  assert.match(ruleDocument, /待正式冻结/);
});

test('public calculators agree with the document for every stem, branch and Qi sequence', () => {
  for (const [stem, expected] of Object.entries(specification.stems)) {
    assert.deepEqual(calculateSuiYun(stem), expected, stem);
  }
  for (const [branch, expected] of Object.entries(specification.branches)) {
    assert.deepEqual(getSitianZaiquan(branch), expected, branch);
    const offset = specification.guestCycle.indexOf(expected.sitian);
    const guestQi = calculateGuestQi(expected.sitian);
    assert.deepEqual(guestQi, Array.from({ length: 6 }, (_, step) => specification.guestCycle[(offset + step + 4) % 6]), branch);
    assert.equal(guestQi[2], expected.sitian, branch);
    assert.equal(guestQi[5], expected.zaiquan, branch);
  }
  specification.hostSteps.forEach(({ hostQi }, index) => assert.equal(getHostQi(index + 1), hostQi));
});

test('every 1900-2100 numeric year follows the documented 60-cycle anchor', () => {
  for (let year = 1900; year <= 2100; year += 1) {
    const index = ((year - specification.anchor) % 60 + 60) % 60;
    const ganzhi = specification.cycle[index];
    assert.deepEqual(calculateStemBranch(year), { year, ganzhi, stem: ganzhi[0], branch: ganzhi[1] });
  }
});

test('60 real-adapter annual results and 360 steps match the tracked business rules', () => {
  for (const [offset, ganzhi] of specification.cycle.entries()) {
    const year = specification.anchor + offset;
    const result = calculateYearYunQi(year, tyme4tsCalendarProvider);
    const { sitian, zaiquan } = specification.branches[ganzhi[1]];
    assert.deepEqual(
      { year: result.year, ganzhi: result.ganzhi, stem: result.stem, branch: result.branch, suiYun: result.suiYun, sitian: result.sitian, zaiquan: result.zaiquan, ruleVersion: result.ruleVersion },
      { year, ganzhi, stem: ganzhi[0], branch: ganzhi[1], suiYun: specification.stems[ganzhi[0]], sitian, zaiquan, ruleVersion: specification.version },
    );
    assert.equal(result.steps.length, 6);
    const sitianIndex = specification.guestCycle.indexOf(sitian);
    result.steps.forEach((step, index) => {
      const expected = specification.hostSteps[index];
      assert.equal(step.index, index + 1);
      assert.equal(step.name, expected.name);
      assert.equal(step.hostQi, expected.hostQi);
      assert.equal(step.guestQi, specification.guestCycle[(sitianIndex + index + 4) % 6]);
      assert.deepEqual(step.start, tyme4tsCalendarProvider.getSolarTermInstant(year, expected.startTerm));
      assert.deepEqual(step.end, tyme4tsCalendarProvider.getSolarTermInstant(
        index === 5 ? year + 1 : year,
        specification.hostSteps[(index + 1) % 6].startTerm,
      ));
      assertRelation(step.hostQi, step.guestQi, step.relation);
    });
    assert.deepEqual(result.start, result.steps[0].start);
    assert.deepEqual(result.end, result.steps[5].end);
    assert.equal(result.steps[2].guestQi, sitian);
    assert.equal(result.steps[5].guestQi, zaiquan);
  }
});

test('all 36 ordered Qi pairs match both the documented priority and independent matrix', () => {
  for (const [row, host] of qiOrder.entries()) {
    for (const [column, guest] of qiOrder.entries()) {
      assert.equal(documentRelation(host, guest), relationRules[relationMatrix[row][column]], `${host} / ${guest} document`);
      assert.equal(specification.labels[documentRelation(host, guest)], expectedRelation(host, guest).traditionalLabel, `${host} / ${guest} label`);
      assertRelation(host, guest, calculateHostGuestRelation(host, guest));
    }
  }
  // R-21 is now an explicitly authorized target. All four relationship fields,
  // including both directional 相得 labels, are checked against this matrix.
});

