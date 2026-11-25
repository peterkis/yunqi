import { act, render, screen, within } from '@testing-library/react';
import type { CSSProperties } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionVisibility } from '../../../components/layout/SessionVisibility';
import { createAssessmentDto } from '../../../test/learning-fixtures';
import { mapAssessment } from '../presentation/map-constitution';
import { ConstitutionDimension } from './ConstitutionDimension';
import { ConstitutionResults } from './ConstitutionResults';
import { fadeDestroyedAnswer } from './destroy-answer-visual';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); localStorage.clear(); Reflect.deleteProperty(HTMLElement.prototype, 'animate'); });

describe('constitution motion lifecycle', () => {
  it('cancels cosmetic timers on hiding and does not restart them when the retained session returns', () => {
    const assessment = mapAssessment(createAssessmentDto());
    const dimension = { id: 'balanced', shortName: '平和', answered: true, current: false, count: '1/2', label: '平和质：1/2', fillWidth: '50%' };
    function Content({ visible, complete }: { visible: boolean; complete: boolean }) {
      return <SessionVisibility.Provider value={visible}>
        <div role="list" aria-label="维度作答进度"><ConstitutionDimension dimension={complete ? { ...dimension, count: '✓' } : dimension} /></div>
        <ConstitutionResults assessment={assessment} reveal />
      </SessionVisibility.Provider>;
    }
    const view = render(<Content visible complete={false} />);
    view.rerender(<Content visible complete />);
    // Flush jsdom's zero-delay native selectionchange from heading focus.
    act(() => { vi.advanceTimersByTime(0); });
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    view.rerender(<Content visible={false} complete />);
    expect(vi.getTimerCount()).toBe(0);
    expect(within(screen.getByRole('list', { name: '维度作答进度' })).getByRole('listitem')).toHaveAttribute('data-emphasized', 'false');
    expect(screen.getByRole('region', { name: '体质测评结果' })).toHaveAttribute('data-reveal', 'false');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    view.rerender(<Content visible complete />);
    expect(vi.getTimerCount()).toBe(0);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('removes the visual copy and its cleanup timer as soon as its retained session is hidden', async () => {
    Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: vi.fn() });
    const view = render(<div className="theme-root" style={{ '--motion-fast': '120ms' } as CSSProperties}><main><div className="retained-session"><form /></div></main></div>);
    fadeDestroyedAnswer(view.container.querySelector('form'), 'reduced');
    expect(view.container.querySelector('.constitution-destroy-ghost')).not.toBeNull();
    await act(async () => { view.container.querySelector<HTMLElement>('.retained-session')!.hidden = true; });
    expect(view.container.querySelector('.constitution-destroy-ghost')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('emphasizes a newly completed dimension for 600ms without repeating it on rerender or restored progress', () => {
    const dimension = { id: 'balanced', shortName: '平和', answered: true, current: false, count: '1/2', label: '平和质：1/2', fillWidth: '50%' };
    const view = render(<ConstitutionDimension dimension={dimension} />);
    view.rerender(<ConstitutionDimension dimension={{ ...dimension, count: '✓', fillWidth: '100%' }} />);
    expect(screen.getByRole('listitem')).toHaveAttribute('data-emphasized', 'true');
    expect(screen.getByText('✓')).toHaveClass('constitution-dimension-check');
    act(() => { vi.advanceTimersByTime(599); });
    expect(screen.getByRole('listitem')).toHaveAttribute('data-emphasized', 'true');
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.getByRole('listitem')).toHaveAttribute('data-emphasized', 'false');
    view.rerender(<ConstitutionDimension dimension={{ ...dimension, count: '✓' }} />);
    expect(screen.getByRole('listitem')).toHaveAttribute('data-emphasized', 'false');
    view.unmount();
    render(<ConstitutionDimension dimension={{ ...dimension, count: '✓' }} />);
    expect(screen.getByRole('listitem')).toHaveAttribute('data-emphasized', 'false');
  });

  it('consumes a submitted reveal after 400ms and never reveals or takes focus for hidden or directly mounted results', () => {
    const assessment = mapAssessment(createAssessmentDto());
    const view = render(<ConstitutionResults assessment={assessment} reveal />);
    expect(screen.getByRole('region', { name: '体质测评结果' })).toHaveAttribute('data-reveal', 'true');
    expect(screen.getByRole('heading', { name: '平和质' })).toHaveFocus();
    act(() => { vi.advanceTimersByTime(400); });
    expect(screen.getByRole('region', { name: '体质测评结果' })).toHaveAttribute('data-reveal', 'false');
    view.unmount();
    const hidden = render(<SessionVisibility.Provider value={false}><ConstitutionResults assessment={assessment} reveal /></SessionVisibility.Provider>);
    expect(screen.getByRole('region', { name: '体质测评结果' })).toHaveAttribute('data-reveal', 'false');
    expect(screen.getByRole('heading', { name: '平和质' })).not.toHaveFocus();
    hidden.unmount();
    render(<ConstitutionResults assessment={assessment} />);
    expect(screen.getByRole('region', { name: '体质测评结果' })).toHaveAttribute('data-reveal', 'false');
  });

  it('guards optional destruction WAAPI, makes its copy inert and removes it independently of live form unmount', async () => {
    const animate = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });
    const view = render(<div className="theme-root" style={{ '--motion-fast': '120ms', '--ease-exit': 'linear' } as CSSProperties}><main><form id="live"><h3 id="question" tabIndex={-1}>当前题干</h3><span role="img" aria-live="polite" aria-label="当前进度">1 / 8</span><button id="choice" name="answer" type="button" aria-describedby="question">选中态</button></form></main></div>);
    const form = document.getElementById('live') as HTMLFormElement;
    fadeDestroyedAnswer(form, 'off');
    expect(animate).not.toHaveBeenCalled();
    fadeDestroyedAnswer(form, 'full');
    const ghost = document.querySelector<HTMLElement>('.constitution-destroy-ghost')!;
    expect(ghost.parentElement).toBe(form.closest('main'));
    expect(ghost.inert).toBe(true);
    expect(ghost).toHaveAttribute('aria-hidden', 'true');
    expect(ghost.querySelector('[id], [name], form')).toBeNull();
    expect(ghost.querySelector('[aria-live], [aria-label], [aria-describedby], [role], [tabindex]')).toBeNull();
    expect(screen.getAllByRole('heading', { name: '当前题干' })).toHaveLength(1);
    expect(screen.getAllByRole('img', { name: '当前进度' })).toHaveLength(1);
    expect(animate).toHaveBeenCalledWith([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: 'linear', fill: 'forwards' });
    form.remove();
    expect(screen.queryByRole('heading', { name: '当前题干' })).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: '当前进度' })).not.toBeInTheDocument();
    expect(ghost).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(120); });
    expect(ghost).not.toBeInTheDocument();
    const replacement = document.createElement('form');
    view.container.querySelector('.theme-root')!.append(replacement);
    fadeDestroyedAnswer(replacement, 'reduced');
    expect(document.querySelector('.constitution-destroy-ghost')).not.toBeNull();
    await act(async () => { view.container.querySelector('.theme-root')!.setAttribute('data-motion', 'off'); });
    expect(document.querySelector('.constitution-destroy-ghost')).toBeNull();
    view.unmount();
    Reflect.deleteProperty(HTMLElement.prototype, 'animate');
  });

  it('silently falls back without an animation API or theme root and when WAAPI throws', () => {
    fadeDestroyedAnswer(null, 'full');
    const view = render(<div className="theme-root"><form /></div>);
    const form = view.container.querySelector('form')!;
    fadeDestroyedAnswer(form, 'full');
    expect(document.querySelector('.constitution-destroy-ghost')).toBeNull();
    const animate = vi.fn(() => { throw new Error('unsupported engine'); });
    Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });
    expect(() => fadeDestroyedAnswer(form, 'reduced')).not.toThrow();
    expect(document.querySelector('.constitution-destroy-ghost')).toBeNull();
    form.remove();
    fadeDestroyedAnswer(form, 'full');
    expect(animate).toHaveBeenCalledOnce();
    Reflect.deleteProperty(HTMLElement.prototype, 'animate');
  });

  it('positions the outgoing copy in panel coordinates at a workstation offset and clips it above the actions', () => {
    Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: vi.fn() });
    const view = render(<div className="theme-root" style={{ '--motion-fast': '120ms', '--ease-exit': 'linear' } as CSSProperties}><div className="panel-shell"><main><form /></main></div></div>);
    const panel = view.container.querySelector<HTMLElement>('.panel-shell')!;
    const main = panel.querySelector('main')!;
    const form = main.querySelector('form')!;
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue(new DOMRect(966, 0, 400, 860));
    vi.spyOn(main, 'getBoundingClientRect').mockReturnValue(new DOMRect(966, 100, 400, 660));
    vi.spyOn(form, 'getBoundingClientRect').mockReturnValue(new DOMRect(982, 120, 368, 900));
    fadeDestroyedAnswer(form, 'full');
    const ghost = panel.querySelector<HTMLElement>('.constitution-destroy-ghost')!;
    expect(ghost.parentElement).toBe(panel);
    expect(ghost.style.getPropertyValue('--destroy-left')).toBe('16px');
    expect(ghost.style.getPropertyValue('--destroy-top')).toBe('120px');
    expect(ghost.style.getPropertyValue('--destroy-width')).toBe('368px');
    expect(ghost.style.getPropertyValue('--destroy-height')).toBe('640px');
    expect(ghost.style.getPropertyValue('--destroy-clip-top')).toBe('0px');
    vi.mocked(form.getBoundingClientRect).mockReturnValue(new DOMRect(982, 60, 368, 900));
    fadeDestroyedAnswer(form, 'full');
    const clipped = panel.querySelectorAll<HTMLElement>('.constitution-destroy-ghost')[1]!;
    expect(clipped.style.getPropertyValue('--destroy-clip-top')).toBe('40px');
    act(() => { vi.advanceTimersByTime(120); });
    expect(ghost).not.toBeInTheDocument();
  });
});
