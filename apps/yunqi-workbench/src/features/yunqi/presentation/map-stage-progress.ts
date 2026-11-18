import type { StageProgressDto } from '@yunqi/contracts';
import type { StageProgressViewModel } from './view-model';

export function mapStageProgress(progress: StageProgressDto, boundary: {
  readonly startLabel: string;
  readonly endLabel: string;
  readonly endLocalTime: string;
  readonly transition: '交气' | '交运';
}): StageProgressViewModel {
  // The API owns calendar days and duration. Only format the supplied facts.
  const remaining = progress.remainingCalendarDays > 0
    ? `还有 ${progress.remainingCalendarDays} 天`
    : `今日 ${boundary.endLocalTime.slice(11, 16)} ${boundary.transition}`;
  const elapsedPercent = progress.elapsedRatio * 100;
  return {
    subtitle: `${boundary.startLabel} → ${boundary.endLabel} · ${remaining}`,
    elapsedWidth: `${elapsedPercent}%`,
    elapsedLabel: `已过约 ${Math.round(elapsedPercent)}%`,
  };
}
