import { InfoCard } from '../../../components/design/InfoCard';
import { InquiryCapabilityCard } from '../components/InquiryCapabilityCard';

export function InquiryEntryPage() {
  return (
    <div className="drilldown-page drilldown-inquiry">
      <InfoCard label="问诊规划" meta="规划中">
        <h2 className="drilldown-title">问诊结构化入口</h2>
        <p className="drilldown-copy">
          为未来患者上下文、历史记录和结构化记录能力建立安全入口。本阶段不创建、保存或分析患者记录。
        </p>
        <p className="drilldown-meta">仅展示后续规划；患者信息、问诊采集与记录均未开放。</p>
      </InfoCard>

      <InfoCard label="未来能力">
        <p className="drilldown-copy">以下能力仅展示规划边界，尚未开放操作。</p>
        <div className="drilldown-inquiry__capabilities">
          <InquiryCapabilityCard
            title="患者上下文"
            description="为未来患者引用与展示信息预留位置。"
          />
          <InquiryCapabilityCard
            title="历史记录"
            description="为未来经授权的数据查看与教学复盘预留入口。"
          />
          <InquiryCapabilityCard
            title="新建结构化记录"
            description="为未来经确认的专业流程预留入口。"
          />
        </div>
      </InfoCard>
    </div>
  );
}
