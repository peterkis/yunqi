import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useMotionLevel } from './MotionProvider';
import { updateWithViewTransition } from '../app/navigation-transition';

type Theme = 'light' | 'dark';
const FRAME_FALLBACK_MS = 16;

interface ThemeContextValue {
  readonly theme: Theme;
  readonly toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  readonly children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const motion = useMotionLevel();
  const [theme, setTheme] = useState<Theme>('light');
  const rootRef = useRef<HTMLDivElement>(null);
  const frame = useRef<number | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function cancelCleanup() {
    if (frame.current !== undefined) window.cancelAnimationFrame(frame.current);
    clearTimeout(timer.current);
  }
  useEffect(() => cancelCleanup, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme: () => {
        // The root snapshot includes the full application; navigation names
        // are disabled by this scope before the old theme is captured.
        document.documentElement.dataset.viewTransition = 'theme';
        updateWithViewTransition(() => {
          cancelCleanup();
          rootRef.current?.setAttribute('data-theme-switching', '');
          setTheme((currentTheme) => currentTheme === 'light' ? 'dark' : 'light');
          const removeMarker = () => rootRef.current?.removeAttribute('data-theme-switching');
          if (typeof window.requestAnimationFrame === 'function') {
            frame.current = window.requestAnimationFrame(() => {
              frame.current = window.requestAnimationFrame(removeMarker);
            });
          } else {
            // Approximate two paint frames when the scheduling API is absent;
            // zero-delay tasks could both run before the first themed paint.
            timer.current = setTimeout(() => {
              timer.current = setTimeout(removeMarker, FRAME_FALLBACK_MS);
            }, FRAME_FALLBACK_MS);
          }
        }, motion);
      },
    }),
    [theme, motion],
  );

  return (
    <ThemeContext.Provider value={value}>
      <div ref={rootRef} className="theme-root" data-theme={theme} data-motion={motion}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return value;
}
