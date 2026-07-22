import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('application bootstrap', () => {
  it('mounts the Workbench into the root element', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    window.history.replaceState(null, '', '/yunqi/current');

    await act(async () => {
      await import('./main');
    });

    expect(
      screen.getByRole('heading', { name: 'TCM YunQi Lab' }),
    ).toBeInTheDocument();
  });
});
