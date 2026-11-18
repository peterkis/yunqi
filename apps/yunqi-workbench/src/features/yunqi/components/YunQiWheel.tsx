import type { YunQiStageStatusCode, YunQiWheelViewModel } from '../presentation/view-model';

// Fixed SVG geometry from prototype-finals/reference/01-current.html.
// Segment status and progress are supplied by the presentation mapper.
const QI_SEGMENTS = [
  { path: 'M123.2 12 A108 108 0 0 1 211.9 63.2 L191.5 75.8 A84 84 0 0 0 122.5 36 Z', x: 168, y: 40.9 },
  { path: 'M215.1 68.8 A108 108 0 0 1 215.1 171.2 L194 159.8 A84 84 0 0 0 194 80.2 Z', x: 216, y: 124 },
  { path: 'M211.9 176.8 A108 108 0 0 1 123.2 228 L122.5 204 A84 84 0 0 0 191.5 164.2 Z', x: 168, y: 207.1 },
  { path: 'M116.8 228 A108 108 0 0 1 28.1 176.8 L48.5 164.2 A84 84 0 0 0 117.5 204 Z', x: 72, y: 207.1 },
  { path: 'M24.9 171.2 A108 108 0 0 1 24.9 68.8 L46 80.2 A84 84 0 0 0 46 159.8 Z', x: 24, y: 124 },
  { path: 'M28.1 63.2 A108 108 0 0 1 116.8 12 L117.5 36 A84 84 0 0 0 48.5 75.8 Z', x: 72, y: 40.9 },
] as const;

const MOVEMENT_SEGMENTS = [
  'M122.3 42 A78 78 0 0 1 193.4 93.7 L178.4 99.1 A62 62 0 0 0 121.9 58 Z',
  'M194.9 98.1 A78 78 0 0 1 167.7 181.7 L157.9 169 A62 62 0 0 0 179.5 102.6 Z',
  'M163.9 184.5 A78 78 0 0 1 76.1 184.5 L85.1 171.2 A62 62 0 0 0 154.9 171.2 Z',
  'M72.3 181.7 A78 78 0 0 1 45.1 98.1 L60.5 102.6 A62 62 0 0 0 82.1 169 Z',
  'M46.6 93.7 A78 78 0 0 1 117.7 42 L118.1 58 A62 62 0 0 0 61.6 99.1 Z',
] as const;

const QI_FILLS: Record<YunQiStageStatusCode, string> = {
  completed: 'var(--accent-muted)', current: 'var(--accent)', upcoming: 'var(--surface-sunken)',
};
const MOVEMENT_FILLS: Record<YunQiStageStatusCode, string> = {
  completed: 'var(--relation-favorable-bg)', current: 'var(--relation-favorable-fg)', upcoming: 'var(--surface-sunken)',
};

export function YunQiWheel({ viewModel }: { readonly viewModel: YunQiWheelViewModel }) {
  return <>
    <div className="current-year-wheel">
      <svg viewBox="0 0 240 240" role="img" aria-label={viewModel.label}>
        <g aria-hidden="true" data-ring="qi">
          {viewModel.qi.map((segment) => <g key={segment.index} className={`is-${segment.status}`} data-index={segment.index}>
            <path d={QI_SEGMENTS[segment.index - 1]!.path} style={{ fill: QI_FILLS[segment.status] }} />
            <text x={QI_SEGMENTS[segment.index - 1]!.x} y={QI_SEGMENTS[segment.index - 1]!.y} textAnchor="middle" className="current-year-wheel__tick">{segment.tickLabel}</text>
          </g>)}
        </g>
        <g aria-hidden="true" data-ring="movement">
          {viewModel.movements.map((segment) => <path key={segment.index} className={`is-${segment.status}`} data-index={segment.index}
            d={MOVEMENT_SEGMENTS[segment.index - 1]} style={{ fill: MOVEMENT_FILLS[segment.status] }} />)}
        </g>
      </svg>
      <div className="current-year-heading">
        <h3>{viewModel.ganzhi}</h3>
        <p>{viewModel.annualLabel}</p>
      </div>
    </div>
    <div className="current-year-wheel__legend">
      <span><span className="current-year-wheel__key current-year-wheel__key--qi" aria-hidden="true" />外环 · 六步气</span>
      <span><span className="current-year-wheel__key current-year-wheel__key--movement" aria-hidden="true" />内环 · 五步运</span>
    </div>
  </>;
}
