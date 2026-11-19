import { describe, expect, it, vi } from 'vitest';
import {
  detectBrowserEngine, evaluateFrameIntervals, evaluateInFlightSample,
  formatMotionDiagnostics, formatMotionStatus, parseIdleFrameStorage,
  parseInFlightFrameStorage, resolveMotionState, serializeInFlightFrameStorage,
  type MotionLevel, type MotionReason, type MotionResolutionInput,
} from './motion-diagnostics';

const automatic: MotionResolutionInput = {
  urlOff: false, forcedColors: false, supportsHas: true,
  supportsViewTransition: true, supportsStartingStyle: true,
  preference: 'auto', systemReduced: false,
};

describe('motion reason priority agreed for M1-e', () => {
  it.each(['auto', 'full', 'reduced', 'off'] as const)('hard off overrides %s and every softer reason', preference => {
    const conflicting = { ...automatic, preference, systemReduced: true,
      supportsViewTransition: false, supportsStartingStyle: false,
      idleFrameResult: 'reduced', inFlightFrameResult: 'reduced' } as const;
    expect(resolveMotionState({ ...conflicting, urlOff: true, forcedColors: true, supportsHas: false }))
      .toEqual({ level: 'off', reason: 'url' });
    expect(resolveMotionState({ ...conflicting, forcedColors: true, supportsHas: false }))
      .toEqual({ level: 'off', reason: 'forced-colors' });
    expect(resolveMotionState({ ...conflicting, supportsHas: false }))
      .toEqual({ level: 'off', reason: 'no-has' });
  });

  it.each(['full', 'reduced', 'off'] as const)('manual %s overrides system, capability and both frame results', preference => {
    expect(resolveMotionState({ ...automatic, preference, systemReduced: true,
      supportsViewTransition: false, supportsStartingStyle: false,
      idleFrameResult: 'reduced', inFlightFrameResult: 'reduced' }))
      .toEqual({ level: preference, reason: 'manual' });
  });

  it.each([
    [{ systemReduced: true, supportsViewTransition: false, supportsStartingStyle: false, idleFrameResult: 'reduced', inFlightFrameResult: 'reduced' }, 'reduced', 'system'],
    [{ supportsViewTransition: false, idleFrameResult: 'reduced', inFlightFrameResult: 'reduced' }, 'reduced', 'no-view-transition'],
    [{ supportsStartingStyle: false, idleFrameResult: 'reduced', inFlightFrameResult: 'reduced' }, 'reduced', 'no-view-transition'],
    [{ idleFrameResult: 'reduced', inFlightFrameResult: 'reduced' }, 'reduced', 'frame-idle'],
    [{ idleFrameResult: 'full', inFlightFrameResult: 'reduced' }, 'reduced', 'frame-in-flight'],
    [{ inFlightFrameResult: 'reduced' }, 'reduced', 'frame-in-flight'],
    [{ idleFrameResult: 'full', inFlightFrameResult: 'full' }, 'full', 'default'],
    [{}, 'full', 'default'],
  ] as const)('resolves automatic conflicts %j to %s / %s', (overrides, level, reason) => {
    expect(resolveMotionState({ ...automatic, ...overrides })).toEqual({ level, reason });
  });

  it('accepts an unspecified starting-style capability from older callers', () => {
    const { supportsStartingStyle: _unused, ...input } = automatic;
    expect(resolveMotionState(input)).toEqual({ level: 'full', reason: 'default' });
  });
});

describe('rendering-only frame thresholds', () => {
  it.each([
    ['smooth', Array(30).fill(16), 'full'],
    ['exact average', Array(30).fill(24), 'full'],
    ['over average', Array(30).fill(25), 'reduced'],
    ['exact one third long frames', [51, 10, 10], 'full'],
    ['over one third long frames with low mean', [51, 51, 0, 0, 0], 'reduced'],
    ['exact long-frame threshold', [50, 0, 0], 'full'],
    ['empty', [], 'full'],
    ['invalid only', [NaN, Infinity, -Infinity, -1], 'full'],
    ['invalid values do not dilute a slow valid frame', [NaN, -1, Infinity, 80], 'reduced'],
    ['zero timestamps are safe', [0, 0, 0], 'full'],
  ] as const)('%s', (_name, intervals, outcome) => {
    expect(evaluateFrameIntervals(intervals)).toBe(outcome);
    expect(evaluateInFlightSample({ frameIntervals: intervals })).toBe(outcome);
  });

  it.each([
    [[], [80], 'reduced'],
    [[], [20], 'full'],
    [[], [NaN, Infinity, 0, -80], 'full'],
    [[...Array(9).fill(16), 60], [60], 'full'],
    [[...Array(9).fill(16), 60], [60, 200], 'reduced'],
    [[0, 0], [51, 51], 'reduced'],
    [[60], [20], 'reduced'],
    [[16, 16], [], 'full'],
  ] as const)('combines rAF %j with LoAF %j without counting a shared long frame twice', (frameIntervals, durations, outcome) => {
    const longAnimationFrames = durations.map((duration, index) => ({ duration, startTime: index * 100 }));
    const before = [...frameIntervals];
    expect(evaluateInFlightSample({ frameIntervals, longAnimationFrames })).toBe(outcome);
    expect(frameIntervals).toEqual(before);
    expect(longAnimationFrames.map(entry => entry.duration)).toEqual(durations);
  });
});

describe('optional session cache formats', () => {
  it.each([null, '', 'unknown', 'frame-idle', 'FULL'])('ignores invalid cache value %s', value => {
    expect(parseIdleFrameStorage(value)).toBeUndefined();
    expect(parseInFlightFrameStorage(value)).toBeUndefined();
  });
  it.each(['full', 'reduced'] as const)('round trips %s and keeps idle storage separate', outcome => {
    expect(parseIdleFrameStorage(outcome)).toBe(outcome);
    expect(parseInFlightFrameStorage(outcome)).toBe(outcome);
    const serialized = serializeInFlightFrameStorage(outcome);
    expect(serialized).toBe(outcome === 'reduced' ? 'frame-in-flight' : 'full');
    expect(parseInFlightFrameStorage(serialized)).toBe(outcome);
  });
  it('reads the explicit in-flight reason only in the in-flight cache', () => {
    expect(parseInFlightFrameStorage('frame-in-flight')).toBe('reduced');
    expect(parseIdleFrameStorage('frame-in-flight')).toBeUndefined();
  });
});

describe('display-only browser engine', () => {
  it.each(['Not=A?Brand', 'Not_A Brand', '(Not(A:Brand'])('ignores GREASE %s and prefers Chromium over vendor brands', brand => {
    expect(detectBrowserEngine({ userAgentData: { brands: [
      { brand, version: '99' }, { brand: 'Microsoft Edge', version: '129' },
      { brand: ' Chromium ', version: ' 130.0.1' },
    ] }, userAgent: 'Firefox/128' })).toBe('Chromium 130');
  });
  it('uses the first valid non-GREASE brand when Chromium is absent', () => {
    expect(detectBrowserEngine({ userAgentData: { brands: [
      { brand: '', version: '1' }, { brand: 'Broken', version: 'unknown' },
      { brand: 'Not_A Brand', version: '99' }, { brand: 'Microsoft Edge', version: '129.1' },
      { brand: 'Other', version: '130' },
    ] } })).toBe('Microsoft Edge 129');
  });
  it.each([undefined, [], [{ brand: 'Chromium', version: '' }], [{ brand: 'Chromium', version: 'unknown' }]])('falls back to the UA when brands lack a major version: %j', brands => {
    expect(detectBrowserEngine({ userAgentData: { brands }, userAgent: 'Chrome/109.0' })).toBe('Chromium 109');
  });
  it.each([
    ['Chromium/109.0', 'Chromium 109'], ['HeadlessChrome/130.0', 'Chromium 130'],
    ['Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 Chrome/109.0.0.0 Safari/537.36 QIHU 360SE', 'Chromium 109'],
    ['Edg/129.0', 'Edge 129'], ['Firefox/128.0', 'Firefox 128'],
    ['Version/17.6 Safari/605.1.15', 'Safari 17'], ['Safari/605.1', 'Safari 605'],
    ['AppleWebKit/605.1', 'WebKit 605'], ['', '未知内核'], ['unrecognized', '未知内核'],
  ])('parses %s as %s', (userAgent, expected) => {
    expect(detectBrowserEngine({ userAgent })).toBe(expected);
  });
  it('handles an empty source and a non-browser environment', () => {
    expect(detectBrowserEngine({})).toBe('未知内核');
    vi.stubGlobal('navigator', undefined);
    try { expect(detectBrowserEngine()).toBe('未知内核'); }
    finally { vi.unstubAllGlobals(); }
  });
});

const reasonLabels: readonly (readonly [MotionReason, string])[] = [
  ['url', 'URL 参数'], ['forced-colors', '高对比度'], ['no-has', '内核过旧'],
  ['manual', '手动选择'], ['system', '系统减少动态效果'], ['no-view-transition', '缺视图过渡'],
  ['frame-idle', '空闲帧率偏低'], ['frame-in-flight', '动画中帧率偏低'], ['default', '默认'],
];
const levels: readonly (readonly [MotionLevel, string])[] = [['full', '标准'], ['reduced', '精简'], ['off', '关闭']];
describe('motion copy agreed after review', () => {
  for (const [level, label] of levels) it.each(reasonLabels)('%s status and diagnostics in ' + level, (reason, reasonLabel) => {
    const prefix = reason === 'manual' ? '已手动选择' : '自动跟随系统与设备能力';
    expect(formatMotionStatus(level, reason)).toBe(`${prefix}，当前：${label}（原因：${reasonLabel}）`);
    expect(formatMotionDiagnostics(level, reason, 'Chromium 109')).toBe(`动效 ${label} · ${reason} · Chromium 109`);
  });
});
