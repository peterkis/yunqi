import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { AppRoutes } from '../../../../app/AppRoutes';
import { createClientStub, createLearningDto } from '../../../../test/learning-fixtures';
import { createTestWrapper } from '../../../../test/test-utils';
import type { BirthYearComparisonDto } from '@yunqi/contracts';

it('preserves annual precision and the same snapshot in the table, readings and assessment after month-only entry', async () => {
  const user = userEvent.setup();
  const current = createLearningDto();
  const facts = current.facts;
  const candidate = {
    year: 1980, ganzhi: '庚申', suiYun: facts.suiYun, sitian: facts.sixQi.sitian, zaiquan: facts.sixQi.zaiquan,
    label: '大寒交节起', from: facts.interval.start, until: facts.interval.end, annualPassages: current.annualPassages,
    comparisons: ['中运对照', '司天对照', '在泉对照'].map(title => ({ ...current.annualRelation, title, label: '同五行' })),
  };
  const result: BirthYearComparisonDto = { birthPrecision: 'year', current, message: '年度候选',
    candidates: [{ ...candidate, year: 1979, ganzhi: '己未', label: '大寒交节前' }, candidate] };
  const client = createClientStub({ compareBirthYear: vi.fn().mockResolvedValue(result) });
  render(<AppRoutes />, { wrapper: createTestWrapper(client, '/yunqi/birth') });
  await user.click(screen.getByRole('radio', { name: '按出生年份' }));
  await user.type(screen.getByRole('textbox', { name: '年' }), '1980');
  await user.keyboard('3');
  await user.click(screen.getByRole('button', { name: '仅按年份对照' }));
  const tables = await screen.findAllByRole('table');
  expect(tables).toHaveLength(2);
  for (const table of tables) expect(within(table).getAllByRole('rowheader')).toHaveLength(3);
  const toggles = screen.getAllByRole('button', { name: '这些关系怎么读？' });
  await user.click(toggles[0]);
  const annualMatrix = screen.getByRole('table', { name: '三维生克总览' });
  expect(within(annualMatrix).getAllByRole('rowheader').map(th => th.textContent)).toEqual(['岁运', '司天', '在泉']);
  expect(screen.getByText('3项同五行')).toBeVisible();
  expect(screen.getAllByText(current.annualRelation.explanation)).toHaveLength(1);
  await user.click(toggles[1]);
  expect(toggles[0]).toHaveAttribute('aria-expanded', 'true');
  expect(toggles[1]).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getAllByRole('table', { name: '三维生克总览' })).toHaveLength(2);
  await user.click(toggles[0]);
  expect(toggles[0]).toHaveAttribute('aria-expanded', 'false');
  expect(toggles[1]).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getAllByRole('table', { name: '三维生克总览' })).toHaveLength(1);
  expect(client.compareBirthYear).toHaveBeenCalledExactlyOnceWith({ year: 1980 });
  expect(client.previewBirthDate).not.toHaveBeenCalled();
  expect(client.compareBirth).not.toHaveBeenCalled();
  await user.click(screen.getByRole('link', { name: '全部原文' }));
  expect(screen.getByRole('button', { name: '全年' })).toHaveAttribute('aria-pressed','true');
  expect(screen.getByRole('button', { name: '出生阶段' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: '返回' }));
  await user.click(screen.getByRole('link', { name: '体质量表' }));
  expect(await screen.findByRole('form', { name: '中医体质量表' })).toBeVisible();
  expect(screen.getByRole('group', { name: /大寒交节前.*己未.*大寒交节起.*庚申/ })).toBeVisible();
  expect(client.getLearningCurrent).not.toHaveBeenCalled();
  await user.click(screen.getByRole('link', { name: '先天对照' }));
  await user.click(screen.getByRole('button', { name: /补全生日后查看/ }));
  expect(screen.getByRole('textbox', { name: '年' })).toHaveValue('1980');
  expect(screen.getByRole('textbox', { name: '月' })).toHaveValue('03');
  expect(screen.getByRole('textbox', { name: '日' })).toHaveValue('');
  expect(screen.getByRole('textbox', { name: '日' })).toHaveFocus();
});
