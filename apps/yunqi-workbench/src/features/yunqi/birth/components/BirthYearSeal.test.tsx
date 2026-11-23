import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { BirthYearSeal } from './BirthYearSeal';

it('shows only the precision supplied by the current preview', () => {
  const { rerender } = render(<BirthYearSeal multipleDates={false} />);
  const seal = within(screen.getByRole('group', { name: '出生运气预览' }));
  expect(seal.getByText('待录出生信息')).toBeVisible();

  rerender(<BirthYearSeal year={1980} hint="推算 1980 年" multipleDates={false} />);
  expect(seal.getByText('待定')).toBeVisible();
  expect(seal.getByText('推算 1980 年')).toBeVisible();

  rerender(<BirthYearSeal year={1980} multipleDates />);
  expect(seal.getByText('请选择对应公历日期')).toBeVisible();

  rerender(<BirthYearSeal year={1980} annualLabels={['己未年 · 土运不及', '庚申年 · 金运太过']} multipleDates={false} />);
  expect(seal.getByText('年界')).toBeVisible();
  expect(seal.getByText('己未年 ／ 庚申年')).toBeVisible();

  rerender(<BirthYearSeal year={1980} annualLabels={['庚申年 · 金运太过']} multipleDates={false} />);
  expect(seal.getByText('庚申')).toBeVisible();
  expect(seal.getByText('金运太过之年')).toBeVisible();
});
