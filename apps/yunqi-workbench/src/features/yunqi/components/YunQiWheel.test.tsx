import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createLearningDto } from '../../../test/learning-fixtures';
import { mapLearning } from '../presentation/map-learning';
import { YunQiWheel } from './YunQiWheel';

describe('YunQiWheel', () => {
  for (const qiIndex of [1, 5, 6] as const) {
    it.each([1, 5])(`shows qi ${qiIndex} and movement %s with solid current tokens and independent API progress`, (movementIndex) => {
      const dto = createLearningDto();
      const currentStep = dto.facts.sixQi.steps[qiIndex - 1]!;
      const movements = ['初运', '二运', '三运', '四运', '终运'].map((name, index) => ({ ...dto.currentMovement, index: index + 1, name }));
      const learning = mapLearning({ ...dto,
        facts: { ...dto.facts, currentStep, currentStepProgress: { ...dto.facts.currentStepProgress, elapsedRatio: 0.929 } },
        movements, currentMovement: movements[movementIndex - 1]!,
        currentMovementProgress: { ...dto.currentMovementProgress, elapsedRatio: 0.095 },
      });
      render(<YunQiWheel viewModel={learning.annualWheel} />);
      const wheel = screen.getByRole('img');
      expect(wheel).toHaveAccessibleName(`年轮：外环六步气，当前第${qiIndex}步${currentStep.name}，已过约 93%；内环五步运，当前第${movementIndex}运${movements[movementIndex - 1]!.name}，已过约 10%`);
      const qi = [...wheel.querySelectorAll('[data-ring="qi"] > g')];
      const movement = [...wheel.querySelectorAll('[data-ring="movement"] > path')];
      expect(qi).toHaveLength(6);
      expect(movement).toHaveLength(5);
      expect(wheel.querySelectorAll('[data-ring="qi"] .is-current')).toHaveLength(1);
      expect(wheel.querySelectorAll('[data-ring="movement"] .is-current')).toHaveLength(1);
      for (const [index, segment] of qi.entries()) {
        const token = index + 1 < qiIndex ? '--accent-muted' : index + 1 === qiIndex ? '--accent' : '--surface-sunken';
        expect(segment.querySelector('path')).toHaveStyle({ fill: `var(${token})` });
      }
      for (const [index, segment] of movement.entries()) {
        const token = index + 1 < movementIndex ? '--relation-favorable-bg' : index + 1 === movementIndex ? '--relation-favorable-fg' : '--surface-sunken';
        expect(segment).toHaveStyle({ fill: `var(${token})` });
      }
      expect(qi[qiIndex - 1]).toHaveAttribute('data-index', `${qiIndex}`);
      expect(qi[qiIndex - 1]).toHaveClass('is-current');
      expect(movement[movementIndex - 1]).toHaveClass('is-current');
      expect(wheel.querySelector('linearGradient, clipPath, mask')).toBeNull();
      expect(screen.getByRole('heading', { name: '丙午' })).toBeVisible();
      expect(screen.getByText('水运太过之年')).toBeVisible();
    });
  }
});
