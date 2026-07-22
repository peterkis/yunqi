export const navigationItems = [
  {
    id: 'current',
    label: '当前五运六气',
    mark: '今',
    status: 'enabled',
    to: '/yunqi/current',
    end: true,
  },
  {
    id: 'annual',
    label: '年度分析',
    mark: '年',
    status: 'enabled',
    to: '/yunqi/year',
    end: false,
  },
  {
    id: 'inquiry',
    label: '问诊',
    mark: '问',
    status: 'enabled',
    to: '/yunqi/inquiry',
    end: true,
  },
] as const;
