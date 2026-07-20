import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the Workbench identity', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'TCM YunQi Lab' }),
    ).toBeInTheDocument();
  });
});
