import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { FiMoon, FiSun } from 'react-icons/fi';

export default function ThemeToggle({ mobile = false }) {
  const { isDarkMode, toggleTheme } = useTheme();

  if (mobile) {
    return (
      <button
        onClick={toggleTheme}
        className="p-3 rounded-lg transition-all duration-300 w-full flex items-center justify-center gap-2
          bg-gray-100 dark:bg-gray-700 
          hover:bg-gray-200 dark:hover:bg-gray-600 
          text-gray-800 dark:text-gray-200
          border border-gray-300 dark:border-gray-600
          active:scale-95 touch-action-none"
        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label={isDarkMode ? 'Light mode' : 'Dark mode'}
      >
        {isDarkMode ? (
          <>
            <FiSun className="w-6 h-6 text-yellow-400" />
            <span className="text-sm font-medium">Light Mode</span>
          </>
        ) : (
          <>
            <FiMoon className="w-6 h-6 text-blue-600" />
            <span className="text-sm font-medium">Dark Mode</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg transition-all duration-300 transform hover:scale-110
        bg-gray-200 dark:bg-gray-700 
        hover:bg-gray-300 dark:hover:bg-gray-600 
        text-gray-800 dark:text-gray-200
        border border-gray-300 dark:border-gray-600
        shadow-sm hover:shadow-md
        active:scale-95 md:p-2.5"
      title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDarkMode ? 'Light mode' : 'Dark mode'}
    >
      {isDarkMode ? (
        <FiSun className="w-5 h-5 md:w-5 md:h-5 text-yellow-400" />
      ) : (
        <FiMoon className="w-5 h-5 md:w-5 md:h-5 text-blue-600" />
      )}
    </button>
  );
}
