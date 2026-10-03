import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColors, lightTheme, darkTheme } from './tokens';

interface ThemeContextType {
  theme: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = '@cardex_theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // HARD REQUIREMENT: Light Mode is the explicit default on first launch
  const [isDark, setIsDark] = useState<boolean>(false);

  // Restore saved user preference on mount if previously toggled
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (saved === 'dark') {
          setIsDark(true);
        } else if (saved === 'light') {
          setIsDark(false);
        }
        // If no saved preference exists, remains false (Light Mode)
      })
      .catch(() => {
        // Fallback to Light Mode on storage read error
      });
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => useContext(ThemeContext);
