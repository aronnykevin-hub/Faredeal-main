/** @type {import('tailwindcss').Config} */
export default {
  // Enable dark mode using class strategy
  darkMode: 'class',
  
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  
  theme: {
    extend: {
      colors: {
        // Dark mode custom colors
        dark: {
          primary: '#0f172a',
          secondary: '#1e293b',
          tertiary: '#334155',
          accent: '#64748b',
          text: '#f1f5f9',
          'text-secondary': '#cbd5e1',
          border: '#475569',
        },
      },
      backgroundColor: {
        'dark-primary': '#0f172a',
        'dark-secondary': '#1e293b',
        'dark-tertiary': '#334155',
      },
      textColor: {
        'dark-primary': '#f1f5f9',
        'dark-secondary': '#cbd5e1',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      },
    },
  },
  
  plugins: [],
}
