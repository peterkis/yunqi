import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../providers/ThemeProvider';
import { App } from './App';

describe('App', () => {
  it('renders the Workbench foundation against the frozen contract', () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );

    expect(
      screen.getByRole('heading', { name: 'Workbench 基础架构' }),
    ).toBeInTheDocument();
    expect(screen.getByText('YQ-API-CONTRACT-1.0.0')).toBeInTheDocument();
    expect(
      screen.getByText(/仅消费冻结契约，不在展示层计算五运六气规则/),
    ).toBeInTheDocument();
  });
});
