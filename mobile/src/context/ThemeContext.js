import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../utils/theme';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('auto');
  const [theme, setTheme] = useState(systemColorScheme === 'dark' ? darkTheme : lightTheme);

  useEffect(() => {
    loadThemePreference();
  }, []);

  useEffect(() => {
    const resolvedTheme = themeMode === 'auto'
      ? (systemColorScheme === 'dark' ? darkTheme : lightTheme)
      : (themeMode === 'dark' ? darkTheme : lightTheme);
    setTheme(resolvedTheme);
  }, [themeMode, systemColorScheme]);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem('themeMode');
      if (saved) setThemeMode(saved);
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    const currentResolved = themeMode === 'auto'
      ? (systemColorScheme === 'dark' ? 'dark' : 'light')
      : themeMode;
    const newMode = currentResolved === 'dark' ? 'light' : 'dark';
    setThemeMode(newMode);
    await AsyncStorage.setItem('themeMode', newMode);
  };

  const setThemeModeAndSave = async (mode) => {
    setThemeMode(mode);
    await AsyncStorage.setItem('themeMode', mode);
  };

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode: setThemeModeAndSave, toggleTheme, isDark: theme === darkTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
