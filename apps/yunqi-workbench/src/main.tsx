import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { AppProviders } from './providers/AppProviders';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/global.css';
import './styles/design-components.css';
import './styles/panel-shell.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
);
