// Test-only entry; never imported by the application or added to its routes.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Button } from '../components/design/Button';
import { DateField } from '../components/design/DateField';
import { SegmentedControl } from '../components/design/SegmentedControl';
import { ElementDot } from '../components/design/ElementDot';
import { InfoCard } from '../components/design/InfoCard';
import { PanelHeader } from '../components/design/PanelHeader';
import { QuoteBlock } from '../components/design/QuoteBlock';
import { RelationChip } from '../components/design/RelationChip';
import { ScaleOption } from '../components/design/ScaleOption';
import { SegmentedNav } from '../components/design/SegmentedNav';
import { ThemeProvider, useTheme } from '../providers/ThemeProvider';
import { MotionProvider } from '../providers/MotionProvider';
import '../styles/fonts.css';
import '../styles/tokens.css';
import '../styles/type-scale.css';
import '../styles/global.css';
import '../styles/design-components.css';
import '../styles/views/form-controls.css';
import '../styles/views/craft.css';
import '../styles/views/motion-flows.css';

const choices = [
  { shortcut: 1, label: '没有', description: '根本不' },
  { shortcut: 2, label: '很少', description: '有一点' },
  { shortcut: 3, label: '有时', description: '有些' },
  { shortcut: 4, label: '经常', description: '相当' },
  { shortcut: 5, label: '总是', description: '非常' },
] as const;

function DesignFoundations() {
  const { theme, toggleTheme } = useTheme();
  const [answer, setAnswer] = useState(1);
  const [date, setDate] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | ''>('');
  return (
    <main style={{
      boxSizing: 'border-box', width: 'var(--panel-width)', maxWidth: '100%', padding: 'var(--space-4)',
      display: 'grid', gap: 'var(--space-3)', background: 'var(--surface-page)',
    }}>
      <PanelHeader title="运气通" status="理论学习 · 只读展示" actions={
        <Button variant="icon" aria-label={`切换至${theme === 'light' ? '深色' : '浅色'}主题`} onClick={toggleTheme}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" /></svg>
        </Button>
      } />
      <SegmentedNav segments={[
        { label: '当下运气', to: '/', end: true }, { label: '先天对照', to: '/birth' }, { label: '体质量表', to: '/scale' },
      ]} />
      <InfoCard label="五行与关系" meta="展示样例" hint="用于理解理论结构。">
        <ElementDot element="metal" />
        <RelationChip tone="favorable" label="相得" explanation="用于理解运气关系。" />
      </InfoCard>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <Button>查看原文</Button>
        <Button variant="secondary">结束测评</Button>
        <Button variant="text">返回修改</Button>
      </div>
      <InfoCard label="当下原文">
        <QuoteBlock quote="五之气，畏火临……" fullQuote="五之气，畏火临，暑反至，阳迺化。" interpretation="本段用于理论阅读。" source="《素问·六元正纪大论》" notice="文献线索，非个体发病预测。" />
      </InfoCard>
      <InfoCard href="#scale" label="量表入口" meta="展示样例">
        <p>查看量表选项</p>
      </InfoCard>
      <div id="scale" role="radiogroup" aria-label="程度选项">
        {choices.map((choice) => <ScaleOption key={choice.shortcut} {...choice} checked={answer === choice.shortcut} onSelect={() => setAnswer(choice.shortcut)} tabIndex={answer === choice.shortcut ? 0 : -1} />)}
      </div>
      <SegmentedNav compact label="原文范围" segments={[{ label: '全年', to: '/annual' }, { label: '当下阶段', to: '/', end: true }]} />
      <InfoCard compact label="紧凑显示">
        <ElementDot element="metal" compact />
        <RelationChip tone="neutral" label="天符" compact />
      </InfoCard>
      <DateField label="出生日期（公历）" value={date} onChange={setDate} />
      <SegmentedControl label="量表所用性别" compact value={sex} onChange={setSex}
        segments={[{ value: 'male', label: '男' }, { value: 'female', label: '女' }]} />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <MemoryRouter><MotionProvider><ThemeProvider><DesignFoundations /></ThemeProvider></MotionProvider></MemoryRouter>,
);
