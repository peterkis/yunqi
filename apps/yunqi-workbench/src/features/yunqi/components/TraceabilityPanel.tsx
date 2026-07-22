import { YUNQI_API_CONTRACT_ID } from '@yunqi/contracts';
import { DataLabel } from '../../../components/ui/DataLabel';
import { Panel } from '../../../components/ui/Panel';

export interface TraceabilityPanelProps {
  readonly dataSource:
    | 'YunQi 当前查询 API'
    | 'YunQi 年度查询 API';
  readonly ruleVersion: string;
}

export function TraceabilityPanel({
  dataSource,
  ruleVersion,
}: TraceabilityPanelProps) {
  return (
    <Panel
      eyebrow="Traceability"
      title="追溯信息"
      description="用于核对本次结果的接口、规则版本与时间标准。"
    >
      <div className="rule-trace">
        <DataLabel
          label="Contract ID"
          value={<code>{YUNQI_API_CONTRACT_ID}</code>}
        />
        <DataLabel label="数据来源" value={dataSource} />
        <DataLabel
          label="规则版本"
          value={<code>{ruleVersion}</code>}
        />
        <DataLabel label="时间标准" value="北京时间 UTC+08" />
      </div>
    </Panel>
  );
}
