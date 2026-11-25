import { matchPath } from 'react-router-dom';
import type { NavSegmentViewModel } from '../components/design/SegmentedNav';

export const navigationItems = [
  { label: '当下运气', to: '/yunqi/current', end: true },
  { label: '先天对照', to: '/yunqi/birth', end: true },
  { label: '体质量表', to: '/yunqi/constitution', end: true },
] as const satisfies readonly NavSegmentViewModel[];

export type PanelRouteViewModel = {
  readonly id: string;
  readonly title: string;
} & (
  | { readonly kind: 'segment' }
  | { readonly kind: 'drilldown'; readonly subtitle: string; readonly backTo: string }
);

const drilldownRoutes = [
  { id: 'classics', path: '/yunqi/current/classics', title: '原文与释义', subtitle: '全年与当下阶段 · 文献阅读', backTo: '/yunqi/current' },
  { id: 'birth-classics', path: '/yunqi/birth/classics', title: '原文与释义', subtitle: '先天 · 出生阶段', backTo: '/yunqi/birth' },
  { id: 'annual', path: '/yunqi/year/:year?', title: '年度详情', subtitle: '指定运气年 · 教学参考', backTo: '/yunqi/current' },
  { id: 'calculate', path: '/yunqi/calculate', title: '指定时点', subtitle: '提交后分析', backTo: '/yunqi/current' },
  { id: 'inquiry', path: '/yunqi/inquiry', title: '问诊规划', subtitle: '只读规划 · 尚未上线', backTo: '/yunqi/current' },
] as const;

export function getPanelRoute(pathname: string): PanelRouteViewModel {
  const segment = navigationItems.find((item) => matchPath(item.to, pathname));
  if (segment) return { id: segment.to, kind: 'segment', title: segment.label };
  // The root redirect belongs to the current area, so it does not steal initial focus.
  if (pathname === '/') return { id: '/yunqi/current', kind: 'segment', title: '当下运气' };
  const drilldown = drilldownRoutes.find((item) => matchPath(item.path, pathname));
  if (drilldown) return { ...drilldown, kind: 'drilldown' };
  return { id: 'not-found', kind: 'drilldown', title: '页面未找到', subtitle: '此地址不在已批准的功能范围', backTo: '/yunqi/current' };
}
