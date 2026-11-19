import { useMotion } from '../../providers/MotionProvider';
import { SegmentedControl } from '../design/SegmentedControl';

const labels = { full: '标准', reduced: '精简', off: '关闭' } as const;

export function MotionSettings() {
  const { preference, level, setPreference } = useMotion();
  return <details className="current-disclosure motion-settings">
    <summary className="current-more__row">动效设置<svg className="current-more__chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 4 4 4-4 4" /></svg></summary>
    <div className="motion-settings__content">
      <span>动效</span>
      <SegmentedControl label="动效" value={preference} onChange={setPreference} segments={[
        { value: 'auto', label: '自动' }, { value: 'full', label: '标准' },
        { value: 'reduced', label: '精简' }, { value: 'off', label: '关闭' },
      ]} />
      <p>自动跟随系统与设备能力，当前：{labels[level]}。</p>
    </div>
  </details>;
}
