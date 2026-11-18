import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useMotionLevel } from './MotionProvider';

type Theme = 'light' | 'dark';

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
  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme: () => {
        setTheme((currentTheme) =>
          currentTheme === 'light' ? 'dark' : 'light',
        );
      },
    }),
    [theme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <div className="theme-root" data-theme={theme} data-motion={motion}>
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
