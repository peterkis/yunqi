import { act, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { updateWithViewTransition } from './navigation-transition';

const original = Object.getOwnPropertyDescriptor(document, 'startViewTransition');
afterEach(() => {
  if (original) Object.defineProperty(document, 'startViewTransition', original);
  else Reflect.deleteProperty(document, 'startViewTransition');
});
function install(start: (callback: () => void) => unknown) {
  Object.defineProperty(document, 'startViewTransition', { configurable: true, value: start });
}

describe('navigation transition guard', () => {
  it('commits synchronously without the API', () => {
    Reflect.deleteProperty(document, 'startViewTransition');
    const update = vi.fn(() => { document.body.dataset.route = 'next'; });
    updateWithViewTransition(update, 'full');
    expect(document.body.dataset.route).toBe('next');
    expect(update).toHaveBeenCalledOnce();
    delete document.body.dataset.route;
  });

  it.each(['reduced', 'off'] as const)('does not start a transition in %s mode', level => {
    const start = vi.fn(); install(start);
    const update = vi.fn(); updateWithViewTransition(update, level);
    expect(update).toHaveBeenCalledOnce(); expect(start).not.toHaveBeenCalled();
  });

  it('falls back if the API throws before invoking the callback', () => {
    install(() => { throw new Error('unsupported'); });
    const update = vi.fn(); updateWithViewTransition(update, 'full');
    expect(update).toHaveBeenCalledOnce();
  });

  it('does not duplicate a committed update if the API then throws', () => {
    install(callback => { callback(); throw new Error('snapshot failed'); });
    const update = vi.fn(); updateWithViewTransition(update, 'full');
    expect(update).toHaveBeenCalledOnce();
  });

  it('handles asynchronous rejection, keeps the React DOM committed when update throws, and never waits for animation completion', async () => {
    install(callback => {
      const done = Promise.resolve().then(callback);
      return { ready: Promise.reject(new Error('no snapshot')), updateCallbackDone: done,
        get finished() { throw new Error('must not read animation completion'); } };
    });
    let change!: () => void;
    function Route() {
      const [route, setRoute] = useState('before');
      change = () => { setRoute('after'); throw new Error('after queueing navigation'); };
      return <p>{route}</p>;
    }
    render(<Route />);
    await act(async () => { updateWithViewTransition(change, 'full'); });
    expect(screen.getByText('after')).toBeVisible();
  });

  it('falls back on callback rejection before the browser attempted the update', async () => {
    install(() => ({ ready: Promise.reject(new Error('skip')), updateCallbackDone: Promise.reject(new Error('skip')) }));
    const update = vi.fn();
    await act(async () => { updateWithViewTransition(update, 'full'); });
    expect(update).toHaveBeenCalledOnce();
  });
});
