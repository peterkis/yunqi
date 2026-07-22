import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';

interface InquiryCapabilityCardProps {
  readonly description: string;
  readonly title: string;
}

export function InquiryCapabilityCard({
  description,
  title,
}: InquiryCapabilityCardProps) {
  return (
    <Card title={title}>
      <p className="inquiry-capability-card__description">
        {description}
      </p>
      <p className="inquiry-capability-card__status">
        <span>状态</span>
        <Badge>规划中</Badge>
      </p>
    </Card>
  );
}
