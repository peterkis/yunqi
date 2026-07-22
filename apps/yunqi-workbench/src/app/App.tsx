import { YUNQI_API_CONTRACT_ID } from '@yunqi/contracts';
import { AppShell } from '../components/layout/AppShell';
import { AppRoutes } from './AppRoutes';

export function App() {
  return (
    <AppShell>
      <AppRoutes />

      <footer className="workbench-footer">
        <section
          className="contract-panel"
          aria-labelledby="contract-title"
        >
          <div>
            <p className="section-label">Frozen API Contract</p>
            <h3 id="contract-title">契约消费边界</h3>
          </div>
          <div className="contract-detail">
            <code>{YUNQI_API_CONTRACT_ID}</code>
            <p>仅消费冻结契约，不在展示层计算五运六气规则。</p>
          </div>
        </section>

        <aside className="safety-note" aria-label="系统边界">
          <span aria-hidden="true">界</span>
          <p>
            本系统用于理论说明、规则解释与线索整理，不提供自动诊断、辨证或治疗决策。
          </p>
        </aside>
      </footer>
    </AppShell>
  );
}
