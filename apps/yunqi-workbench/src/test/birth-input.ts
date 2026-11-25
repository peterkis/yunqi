import { expect, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';

export async function fillBirthDate(value: string) {
  fireEvent.click(screen.getByRole('radio', { name: '按出生年份' }));
  const parts = value.split('-');
  ['年', '月', '日'].forEach((name, index) => {
    fireEvent.change(screen.getByRole('textbox', { name }), { target: { value: parts[index] } });
  });
  if (!screen.getByRole('textbox', { name: '日' }).getAttribute('aria-invalid')) {
    if (vi.isFakeTimers()) {
      await act(async () => { await vi.advanceTimersByTimeAsync(1); });
      await act(async () => { await vi.advanceTimersByTimeAsync(200); });
      expect(document.querySelector('[data-preview-date]')).toHaveAttribute('data-preview-date', value);
      return;
    }
    await waitFor(() => expect(document.querySelector('[data-preview-date]')).toHaveAttribute('data-preview-date', value));
  }
}
