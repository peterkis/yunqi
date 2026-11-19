import { useLayoutEffect, useRef } from 'react';
import { useMotionLevel } from '../../../providers/MotionProvider';
import { animateMotion, motionMilliseconds } from '../../../lib/motion';
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

// Pure drawing geometry: clockwise SVG arcs, never calendar calculations.
function revealArc(index: number, count: number, radius: number) {
  const point = (angle: number) => `${120 + radius * Math.cos(angle)} ${120 + radius * Math.sin(angle)}`;
  // The prototype leaves a 3.4-degree gap between adjacent segments.
  const inset = 1.7 * Math.PI / 180;
  const start = -Math.PI / 2 + (index - 1) * 2 * Math.PI / count;
  return `M${point(start + inset)} A${radius} ${radius} 0 0 1 ${point(start + 2 * Math.PI / count - inset)}`;
}

function highlightPath(ring: 'qi' | 'movement', index: number) {
  const [count, radius, width, fill] = ring === 'qi'
    ? [6, 96, 24, QI_FILLS.current] as const
    : [5, 70, 16, MOVEMENT_FILLS.current] as const;
  return {
    d: revealArc(index, count, radius),
    pathLength: 1,
    strokeDasharray: 1,
    strokeDashoffset: 0,
    strokeWidth: width,
    // An open arc must not fill its chord. The stroke is the highlight itself,
    // already complete if WAAPI is absent, rejected, cancelled or finished.
    style: { fill, fillOpacity: 0, stroke: fill },
  };
}

export function YunQiWheel({ viewModel }: { readonly viewModel: YunQiWheelViewModel }) {
  const level = useMotionLevel();
  const svgRef = useRef<SVGSVGElement>(null);
  const outgoingRef = useRef<SVGGElement>(null);
  const previous = useRef<{ qi: number; movement: number } | undefined>(undefined);
  const firstDraw = useRef<boolean | undefined>(undefined);
  const qi = viewModel.qi.find(segment => segment.status === 'current')!.index;
  const movement = viewModel.movements.find(segment => segment.status === 'current')!.index;

  useLayoutEffect(() => {
    const svg = svgRef.current!;
    const old = previous.current;
    previous.current = { qi, movement };
    if (firstDraw.current === undefined) {
      firstDraw.current = level === 'full';
      try {
        firstDraw.current = firstDraw.current && sessionStorage.getItem('yunqi-wheel-drawn') !== 'true';
        sessionStorage.setItem('yunqi-wheel-drawn', 'true');
      } catch { /* A blocked session cache never blocks rendering. */ }
    }
    if (level !== 'full') { firstDraw.current = false; return; }
    const animations: Animation[] = [];
    const remember = (animation: Animation | undefined) => { if (animation) animations.push(animation); };
    const changed = old && (old.qi !== qi || old.movement !== movement);
    if (changed) firstDraw.current = false;
    if (!firstDraw.current && !changed) return;
    if (firstDraw.current) {
      for (const path of svg.querySelectorAll('.current-wheel-reveal')) {
        remember(animateMotion(path, level, [{ strokeDashoffset: '1' }, { strokeDashoffset: '0' }], '--motion-emphasis', '--ease-standard'));
      }
    } else if (changed) {
      for (const [ring, before, after] of [
        ['qi', old.qi, qi],
        ['movement', old.movement, movement],
      ] as const) {
        if (before === after) continue;
        const shape = highlightPath(ring, before);
        const ghost = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        ghost.setAttribute('d', shape.d);
        ghost.setAttribute('stroke-width', String(shape.strokeWidth));
        Object.assign(ghost.style, shape.style);
        ghost.setAttribute('data-outgoing', ring);
        outgoingRef.current!.append(ghost);
        remember(animateMotion(ghost, level, [{ opacity: 1 }, { opacity: 0 }], '--motion-fast', '--ease-linear', 'forwards'));
        remember(animateMotion(svg.querySelector(`[data-ring="${ring}"] .is-current${ring === 'qi' ? ' > path' : ''}`), level,
          [{ opacity: 0 }, { opacity: 1 }], '--motion-base'));
      }
    }
    const timer = setTimeout(() => { firstDraw.current = false; outgoingRef.current?.replaceChildren(); }, motionMilliseconds(svg, firstDraw.current ? '--motion-emphasis' : '--motion-fast'));
    return () => {
      clearTimeout(timer);
      for (const animation of animations) animation.cancel();
      outgoingRef.current?.replaceChildren();
    };
  }, [qi, movement, level]);

  return <>
    <div className="current-year-wheel">
      <svg ref={svgRef} viewBox="0 0 240 240" role="img" aria-label={viewModel.label}>
        <g aria-hidden="true" style={{ fill: 'var(--surface-sunken)' }}>
          {QI_SEGMENTS.map((segment, index) => <path key={`qi-${index}`} d={segment.path} />)}
          {MOVEMENT_SEGMENTS.map((path, index) => <path key={`movement-${index}`} d={path} />)}
        </g>
        <g aria-hidden="true" data-ring="qi">
          {viewModel.qi.map((segment) => <g key={segment.index} className={`is-${segment.status}`} data-index={segment.index}>
            <path className={segment.status === 'current' ? 'current-wheel-reveal' : undefined}
              {...(segment.status === 'current' ? highlightPath('qi', segment.index)
                : { d: QI_SEGMENTS[segment.index - 1]!.path, style: { fill: QI_FILLS[segment.status] } })} />
            <text x={QI_SEGMENTS[segment.index - 1]!.x} y={QI_SEGMENTS[segment.index - 1]!.y} textAnchor="middle" className="current-year-wheel__tick">{segment.tickLabel}</text>
          </g>)}
        </g>
        <g aria-hidden="true" data-ring="movement">
          {viewModel.movements.map((segment) => <path key={segment.index}
            className={`is-${segment.status}${segment.status === 'current' ? ' current-wheel-reveal' : ''}`} data-index={segment.index}
            {...(segment.status === 'current' ? highlightPath('movement', segment.index)
              : { d: MOVEMENT_SEGMENTS[segment.index - 1], style: { fill: MOVEMENT_FILLS[segment.status] } })} />)}
        </g>
        <g ref={outgoingRef} aria-hidden="true" />
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
