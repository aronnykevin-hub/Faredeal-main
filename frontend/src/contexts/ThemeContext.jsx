import React, { createContext, useContext, useState, useEffect } from 'react';

// Create Theme Context
const ThemeContext = createContext();

// Theme Provider Component
export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    try {
      // Check localStorage first
      const savedTheme = localStorage.getItem('faredeal-theme');
      
      if (savedTheme) {
        setIsDarkMode(savedTheme === 'dark');
        applyTheme(savedTheme === 'dark');
      } else {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDarkMode(prefersDark);
        applyTheme(prefersDark);
        localStorage.setItem('faredeal-theme', prefersDark ? 'dark' : 'light');
      }
    } catch (error) {
      console.error('Error initializing theme:', error);
      setIsDarkMode(false);
      applyTheme(false);
    }
    setIsLoaded(true);
  }, []);

  // Apply theme to DOM
  const applyTheme = (dark) => {
    const htmlElement = document.documentElement;
    const bodyElement = document.body;
    
    if (dark) {
      htmlElement.classList.add('dark');
      htmlElement.style.colorScheme = 'dark';
      bodyElement.classList.add('dark');
      bodyElement.style.backgroundColor = '#0f172a';
      bodyElement.style.color = '#f1f5f9';
    } else {
      htmlElement.classList.remove('dark');
      htmlElement.style.colorScheme = 'light';
      bodyElement.classList.remove('dark');
      bodyElement.style.backgroundColor = '#ffffff';
      bodyElement.style.color = '#1e293b';
    }
  };

  // Toggle theme
  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const newTheme = !prev;
      applyTheme(newTheme);
      localStorage.setItem('faredeal-theme', newTheme ? 'dark' : 'light');
      return newTheme;
    });
  };

  // Set theme explicitly
  const setTheme = (theme) => {
    const isDark = theme === 'dark';
    setIsDarkMode(isDark);
    applyTheme(isDark);
    localStorage.setItem('faredeal-theme', theme);
  };

  const value = {
    isDarkMode,
    toggleTheme,
    setTheme,
    theme: isDarkMode ? 'dark' : 'light',
    isLoaded
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom Hook to use Theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  
  return context;
};

export default ThemeContext;
