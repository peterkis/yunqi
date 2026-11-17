interface InquiryCapabilityCardProps {
  readonly description: string;
  readonly title: string;
}

export function InquiryCapabilityCard({
  description,
  title,
}: InquiryCapabilityCardProps) {
  return (
    <article className="drilldown-inquiry__capability">
      <h3>{title}</h3>
      <p className="drilldown-copy">
        {description}
      </p>
      <p className="drilldown-meta">
        状态 · <span>规划中</span>
      </p>
    </article>
  );
}
