import { Panel } from '../../../components/ui/Panel';

export interface RuleExplanationPanelProps {
  readonly explanations: readonly string[];
}

export function RuleExplanationPanel({
  explanations,
}: RuleExplanationPanelProps) {
  return (
    <Panel
      title="规则结果说明"
      description="按本次计算结果逐条说明，供规则学习与核对。"
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
