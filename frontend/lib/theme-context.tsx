import { createContext, type ReactNode, useContext } from 'react';

import { getThemePalette, type ThemeMode } from '@/lib/theme';

type AppThemeContextValue = {
  isDark: boolean;
  palette: ReturnType<typeof getThemePalette>;
  setThemeMode: (themeMode: ThemeMode) => void;
  themeMode: ThemeMode;
  toggleTheme: () => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: AppThemeContextValue;
}) {
  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }

  return context;
}
