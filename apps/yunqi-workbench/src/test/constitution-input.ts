import { act } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ANSWER_HOLD_MS } from '../features/constitution/components/ConstitutionForm';

/** Let integration flows explicitly consume the interaction hold. Timing
 * regressions use fireEvent and advance smaller intervals themselves. */
export async function answerByKey(user: ReturnType<typeof userEvent.setup>, keys: string) {
  await user.keyboard(keys);
  act(() => { vi.advanceTimersByTime(ANSWER_HOLD_MS); });
}
