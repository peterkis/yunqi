import { fireEvent, screen } from '@testing-library/react';

export function fillBirthDate(value: string) {
  const parts = value.split('-');
  ['年', '月', '日'].forEach((name, index) => {
    fireEvent.change(screen.getByRole('textbox', { name }), { target: { value: parts[index] } });
  });
}
