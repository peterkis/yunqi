import { act, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('application bootstrap', () => {
  it('mounts the Workbench into the root element', async () => {
    document.body.innerHTML = '<div id="root"></div>';

    await act(async () => {
      await import('./main');
    });

    expect(
      screen.getByRole('heading', { name: 'TCM YunQi Lab' }),
    ).toBeInTheDocument();
  });
});
