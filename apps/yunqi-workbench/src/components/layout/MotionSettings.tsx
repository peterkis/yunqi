import { formatMotionStatus } from '../../lib/motion-diagnostics';
import { useMotion } from '../../providers/MotionProvider';
import { SegmentedControl } from '../design/SegmentedControl';
import { MoreRowSummary } from '../design/MoreRow';

export function MotionSettings() {
  const { preference, level, reason, setPreference } = useMotion();
  return <details className="current-disclosure motion-settings">
    <MoreRowSummary>动效设置</MoreRowSummary>
    <div className="motion-settings__content">
      <span>动效</span>
      <SegmentedControl label="动效" value={preference} onChange={setPreference} segments={[
        { value: 'auto', label: '自动' }, { value: 'full', label: '标准' },
        { value: 'reduced', label: '精简' }, { value: 'off', label: '关闭' },
      ]} />
      <p>{formatMotionStatus(level, reason)}</p>
      {reason === 'system' && <p>选择“标准”可在本应用启用平滑滚轮和完整动效。</p>}
    </div>
  </details>;
}
