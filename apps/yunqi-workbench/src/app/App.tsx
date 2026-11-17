import { PanelShell } from '../components/layout/PanelShell';
import { AppRoutes } from './AppRoutes';

export function App() {
  return (
    <PanelShell>
      <AppRoutes />
    </PanelShell>
  );
}
