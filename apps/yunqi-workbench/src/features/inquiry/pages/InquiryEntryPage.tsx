import { Panel } from '../../../components/ui/Panel';
import { InquiryCapabilityCard } from '../components/InquiryCapabilityCard';

export function InquiryEntryPage() {
  return (
    <div className="inquiry-entry-page">
      <header className="inquiry-entry-page__header">
        <p className="section-label">Workbench / Inquiry</p>
        <h2>问诊结构化入口</h2>
        <p>
          为未来患者上下文、历史记录和结构化记录能力建立安全入口。本阶段不创建、保存或分析患者记录。
        </p>
      </header>

      <Panel
        eyebrow="Inquiry Workspace Foundation"
        title="未来能力"
        description="以下能力仅展示规划边界，尚未开放操作。"
      >
        <div className="inquiry-capability-grid">
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
      </Panel>
    </div>
  );
}
