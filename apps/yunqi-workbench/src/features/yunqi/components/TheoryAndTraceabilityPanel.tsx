import { Panel } from '../../../components/ui/Panel';

export interface TheoryAndTraceabilityPanelProps {
  readonly explanations: readonly string[];
  readonly ruleVersion: string;
}

export function TheoryAndTraceabilityPanel({
  explanations,
  ruleVersion,
}: TheoryAndTraceabilityPanelProps) {
  return (
    <Panel
      eyebrow="Rule Trace"
      title="理论说明与追溯"
      description="以下说明来自 API 结果，前端不扩写领域结论。"
    >
      <ol className="theory-list">
        {explanations.map((explanation, index) => (
          <li key={`${index}-${explanation}`}>{explanation}</li>
        ))}
      </ol>
      <div className="rule-trace">
        <span>规则版本</span>
        <code>{ruleVersion}</code>
      </div>
    </Panel>
  );
}
