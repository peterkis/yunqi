import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { AppProviders } from './providers/AppProviders';
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

if (import.meta.env.DEV) {
  document.body.classList.add('workbench-dev-host');
  void import('./styles/dev-host.css');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter useTransitions={false}>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
);
