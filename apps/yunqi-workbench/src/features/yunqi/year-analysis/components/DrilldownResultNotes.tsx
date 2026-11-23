import { YUNQI_API_CONTRACT_ID } from '@yunqi/contracts';
import { InfoCard } from '../../../../components/design/InfoCard';
import { YunQiTimeDetails } from '../../../../components/time/YunQiTimeDetails';
import type { YunQiTimeEntryViewModel } from '../../presentation/map-drilldown';

export function DrilldownResultNotes({ explanations, ruleVersion, dataSource, times = [] }: {
  readonly explanations: readonly string[];
  readonly ruleVersion: string;
  readonly dataSource: 'YunQi 年度查询 API' | 'YunQi 指定时点计算 API';
  readonly times?: readonly YunQiTimeEntryViewModel[];
}) {
  return <details className="drilldown-technical">
    <summary>计算说明与版本</summary>
    <YunQiTimeDetails entries={times} />
    <InfoCard label="规则结果说明">
      {explanations.length === 0 ? <p className="drilldown-copy">本次结果未提供规则说明</p> : (
        <ol className="drilldown-explanations">{explanations.map((explanation, index) => <li key={`${index}-${explanation}`}>{explanation}</li>)}</ol>
      )}
    </InfoCard>
    <InfoCard label="追溯信息">
      <dl className="drilldown-trace">
        <div><dt>Contract ID</dt><dd><code>{YUNQI_API_CONTRACT_ID}</code></dd></div>
        <div><dt>数据来源</dt><dd>{dataSource}</dd></div>
        <div><dt>规则版本</dt><dd><code>{ruleVersion}</code></dd></div>
      </dl>
    </InfoCard>
  </details>;
}
