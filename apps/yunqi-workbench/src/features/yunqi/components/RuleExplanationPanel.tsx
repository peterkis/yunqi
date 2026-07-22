import { Panel } from '../../../components/ui/Panel';

export interface RuleExplanationPanelProps {
  readonly explanations: readonly string[];
}

export function RuleExplanationPanel({
  explanations,
}: RuleExplanationPanelProps) {
  return (
    <Panel
      eyebrow="Rule Explanation"
      title="规则结果说明"
      description="以下说明来自 API 结果，前端未扩写领域结论。"
    >
      {explanations.length === 0 ? (
        <p>本次结果未提供规则说明</p>
      ) : (
        <ol className="theory-list">
          {explanations.map((explanation, index) => (
            <li key={`${index}-${explanation}`}>{explanation}</li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
