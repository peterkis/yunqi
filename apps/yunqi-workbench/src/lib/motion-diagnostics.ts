export type MotionLevel = 'full' | 'reduced' | 'off';
export type MotionPreference = MotionLevel | 'auto';
export type FrameProbeOutcome = 'full' | 'reduced';
export type MotionReason =
  | 'url'
  | 'forced-colors'
  | 'no-has'
  | 'manual'
  | 'system'
  | 'no-view-transition'
  | 'frame-idle'
  | 'frame-in-flight'
  | 'default';

export interface MotionResolutionInput {
  readonly urlOff: boolean;
  readonly forcedColors: boolean;
  readonly supportsHas: boolean;
  readonly supportsViewTransition: boolean;
  readonly supportsStartingStyle?: boolean;
  readonly preference: MotionPreference;
  readonly systemReduced: boolean;
  readonly idleFrameResult?: FrameProbeOutcome;
  readonly inFlightFrameResult?: FrameProbeOutcome;
}

export interface MotionResolution {
  readonly level: MotionLevel;
  readonly reason: MotionReason;
}

export interface LongAnimationFrameSample {
  readonly duration: number;
  readonly startTime?: number;
}

export interface InFlightFrameSample {
  readonly frameIntervals: readonly number[];
  readonly longAnimationFrames?: readonly LongAnimationFrameSample[];
}

export interface UserAgentBrand {
  readonly brand: string;
  readonly version: string;
}

export interface UserAgentDataLike {
  readonly brands?: readonly UserAgentBrand[];
}

export interface BrowserEngineSource {
  readonly userAgentData?: UserAgentDataLike;
  readonly userAgent?: string;
}

export const MOTION_PREFERENCE_STORAGE_KEY = 'yunqi-motion';
export const MOTION_IDLE_FRAME_STORAGE_KEY = 'yunqi-motion-frame-rate';
export const MOTION_IN_FLIGHT_FRAME_STORAGE_KEY = 'yunqi-motion-frame-in-flight';

export const FRAME_AVERAGE_THRESHOLD_MS = 24;
export const SLOW_FRAME_THRESHOLD_MS = 50;
export const UNKNOWN_BROWSER_ENGINE = '未知内核';

export const MOTION_LEVEL_LABELS: Readonly<Record<MotionLevel, string>> = {
  full: '标准',
  reduced: '精简',
  off: '关闭',
};

export const MOTION_REASON_LABELS: Readonly<Record<MotionReason, string>> = {
  manual: '手动选择',
  system: '系统减少动态效果',
  'forced-colors': '高对比度',
  url: 'URL 参数',
  'no-has': '内核过旧',
  'no-view-transition': '缺视图过渡',
  'frame-idle': '空闲帧率偏低',
  'frame-in-flight': '动画中帧率偏低',
  default: '默认',
};

const GREASE_BRAND_PATTERN = /not[^a-z]*a[^a-z]*brand/i;
const UA_ENGINE_PATTERNS: readonly (readonly [RegExp, string])[] = [
  [/\bChromium\/(\d+)/i, 'Chromium'],
  [/\bHeadlessChrome\/(\d+)/i, 'Chromium'],
  [/\bChrome\/(\d+)/i, 'Chromium'],
  [/\bEdg(?:A|iOS)?\/(\d+)/i, 'Edge'],
  [/\bFirefox\/(\d+)/i, 'Firefox'],
  [/\bVersion\/(\d+)(?:\.\d+)*\s+Safari\//i, 'Safari'],
  [/\bSafari\/(\d+)/i, 'Safari'],
  [/\bAppleWebKit\/(\d+)/i, 'WebKit'],
];

/** Hard off conditions (url > forced-colors > no-has) override manual choices
 * to preserve accessibility and minimum engine constraints. */
export function resolveMotionState(input: MotionResolutionInput): MotionResolution {
  if (input.urlOff) return { level: 'off', reason: 'url' };
  if (input.forcedColors) return { level: 'off', reason: 'forced-colors' };
  if (!input.supportsHas) return { level: 'off', reason: 'no-has' };
  if (input.preference !== 'auto') return { level: input.preference, reason: 'manual' };
  if (input.systemReduced) return { level: 'reduced', reason: 'system' };
  if (!input.supportsViewTransition || input.supportsStartingStyle === false) {
    return { level: 'reduced', reason: 'no-view-transition' };
  }
  if (input.idleFrameResult === 'reduced') return { level: 'reduced', reason: 'frame-idle' };
  if (input.inFlightFrameResult === 'reduced') return { level: 'reduced', reason: 'frame-in-flight' };
  return { level: 'full', reason: 'default' };
}

/** Shared rendering-only threshold check: average > 24ms or > 1/3 frames > 50ms. */
export function evaluateFrameIntervals(intervals: readonly number[]): FrameProbeOutcome {
  const valid = intervals.filter((interval) => Number.isFinite(interval) && interval >= 0);
  if (valid.length === 0) return 'full';
  const total = valid.reduce((sum, interval) => sum + interval, 0);
  const average = total / valid.length;
  const slowFrames = valid.filter((interval) => interval > SLOW_FRAME_THRESHOLD_MS).length;
  return average > FRAME_AVERAGE_THRESHOLD_MS || slowFrames * 3 > valid.length ? 'reduced' : 'full';
}

/** Combine rAF frame intervals with LoAF entries without double-counting slow
 * frames already observed by rAF. Used strictly for rendering diagnostics. */
export function evaluateInFlightSample(sample: InFlightFrameSample): FrameProbeOutcome {
  const validRaf = sample.frameIntervals.filter((interval) => Number.isFinite(interval) && interval >= 0);
  const validLoaf = (sample.longAnimationFrames ?? [])
    .map((entry) => entry.duration)
    .filter((duration) => Number.isFinite(duration) && duration > 0);

  if (validLoaf.length === 0) return evaluateFrameIntervals(validRaf);
  if (validRaf.length === 0) return evaluateFrameIntervals(validLoaf);

  const fastRaf = validRaf.filter((interval) => interval <= SLOW_FRAME_THRESHOLD_MS);
  const slowRaf = validRaf
    .filter((interval) => interval > SLOW_FRAME_THRESHOLD_MS)
    .sort((left, right) => right - left);
  const sortedLoaf = [...validLoaf].sort((left, right) => right - left);

  const mergedSlow: number[] = [];
  const slowPairs = Math.max(slowRaf.length, sortedLoaf.length);
  for (let index = 0; index < slowPairs; index += 1) {
    mergedSlow.push(Math.max(slowRaf[index] ?? 0, sortedLoaf[index] ?? 0));
  }
  return evaluateFrameIntervals([...fastRaf, ...mergedSlow]);
}

export function parseIdleFrameStorage(value: string | null): FrameProbeOutcome | undefined {
  if (value === 'full' || value === 'reduced') return value;
  return undefined;
}

export function parseInFlightFrameStorage(value: string | null): FrameProbeOutcome | undefined {
  if (value === 'frame-in-flight' || value === 'reduced') return 'reduced';
  if (value === 'full') return 'full';
  return undefined;
}

export function serializeInFlightFrameStorage(outcome: FrameProbeOutcome): 'frame-in-flight' | 'full' {
  return outcome === 'reduced' ? 'frame-in-flight' : 'full';
}

function readNavigatorEngineSource(): BrowserEngineSource {
  if (typeof navigator === 'undefined') return {};
  const candidate = navigator as Navigator & { readonly userAgentData?: UserAgentDataLike };
  return {
    userAgentData: candidate.userAgentData,
    userAgent: candidate.userAgent,
  };
}

function extractMajorVersion(version: string): string | undefined {
  return version.trim().match(/^(\d+)/)?.[1];
}

function parseUserAgentBrands(brands: readonly UserAgentBrand[] | undefined): string | undefined {
  if (!Array.isArray(brands) || brands.length === 0) return undefined;
  let fallback: string | undefined;
  for (const entry of brands) {
    const brand = typeof entry?.brand === 'string' ? entry.brand.trim() : '';
    const version = typeof entry?.version === 'string' ? extractMajorVersion(entry.version) : undefined;
    if (!brand || !version || GREASE_BRAND_PATTERN.test(brand)) continue;
    if (brand.toLowerCase() === 'chromium') return `Chromium ${version}`;
    if (fallback === undefined) fallback = `${brand} ${version}`;
  }
  return fallback;
}

function parseUserAgentString(userAgent: string | undefined): string | undefined {
  if (typeof userAgent !== 'string' || !userAgent.trim()) return undefined;
  for (const [pattern, name] of UA_ENGINE_PATTERNS) {
    const major = userAgent.match(pattern)?.[1];
    if (major) return `${name} ${major}`;
  }
  return undefined;
}

/** Display-only browser engine and major version. Never used to decide motion level. */
export function detectBrowserEngine(source?: BrowserEngineSource): string {
  const resolved = source ?? readNavigatorEngineSource();
  return parseUserAgentBrands(resolved.userAgentData?.brands)
    ?? parseUserAgentString(resolved.userAgent)
    ?? UNKNOWN_BROWSER_ENGINE;
}

export function formatMotionStatus(level: MotionLevel, reason: MotionReason): string {
  const source = reason === 'manual' ? '已手动选择' : '自动跟随系统与设备能力';
  return `${source}，当前：${MOTION_LEVEL_LABELS[level]}（原因：${MOTION_REASON_LABELS[reason]}）`;
}

export function formatMotionDiagnostics(
  level: MotionLevel,
  reason: MotionReason,
  engine: string,
): string {
  return `动效 ${MOTION_LEVEL_LABELS[level]} · ${reason} · ${engine}`;
}
