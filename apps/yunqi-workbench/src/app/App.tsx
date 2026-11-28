import { PanelShell, type PanelHostMotionHooks } from '../components/layout/PanelShell';
import { AppRoutes } from './AppRoutes';

export function App({ host }: { readonly host?: PanelHostMotionHooks } = {}) {
  return (
    <PanelShell {...host}>
      <AppRoutes />
    </PanelShell>
  );
}
