import { formatMotionStatus } from '../../lib/motion-diagnostics';
import { useMotion } from '../../providers/MotionProvider';
import { SegmentedControl } from '../design/SegmentedControl';

export function MotionSettings() {
  const { preference, level, reason, setPreference } = useMotion();
  return <details className="current-disclosure motion-settings">
    <summary className="current-more__row">动效设置<svg className="current-more__chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 4 4 4-4 4" /></svg></summary>
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
