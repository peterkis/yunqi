import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { AppProviders } from './providers/AppProviders';
import { connectDesktop, trackDesktopFoldedWindow } from './providers/desktop-host';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/type-scale.css';
import './styles/global.css';
import './styles/design-components.css';
import './styles/panel-shell.css';
import './styles/views/current-yunqi.css';
import './styles/views/birth.css';
import './styles/views/drilldown.css';
import './styles/views/constitution.css';
import './styles/views/form-controls.css';
import './styles/views/learning-reading.css';
import './styles/views/craft.css';
import './styles/views/current-finals.css';
import './styles/views/classics.css';
import './styles/views/motion-flows.css';
import './styles/views/constitution-motion.css';
import './styles/views/current-motion.css';
import './styles/views/panel-motion.css';
import './styles/background-surface.css';

if (import.meta.env.DEV) {
  document.body.classList.add('workbench-dev-host');
  void import('./styles/dev-host.css');
}

const desktop = window.__TAURI__ && connectDesktop(window.__TAURI__.core, window.__TAURI__.event);
if (desktop) {
  document.documentElement.classList.add('windows-sidebar');
  const stopTracking = trackDesktopFoldedWindow(window.matchMedia('(max-height: 8px)'));
  import.meta.hot?.dispose(stopTracking);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter useTransitions={false}>
      <AppProviders yunqiClient={desktop?.client} queryClient={desktop?.queryClient}>
        <App host={desktop} />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
);
