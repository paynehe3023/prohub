/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // iOS 系统色系
        ios: {
          blue:    '#007AFF',
          purple:  '#5856D6',
          pink:    '#FF2D55',
          red:     '#FF3B30',
          orange:  '#FF9500',
          yellow:  '#FFCC00',
          green:   '#34C759',
          teal:    '#5AC8FA',
          indigo:  '#5856D6',
        },
        // 毛玻璃背景色阶
        glass: {
          light:  '#F2F2F7',
          white:  'rgba(255,255,255,0.72)',
          card:   'rgba(255,255,255,0.60)',
          strong: 'rgba(255,255,255,0.85)',
          border: 'rgba(255,255,255,0.50)',
        },
        // 暗黑模式毛玻璃
        'glass-dark': {
          bg:     '#1C1C1E',
          card:   'rgba(28,28,30,0.60)',
          strong: 'rgba(28,28,30,0.85)',
          border: 'rgba(255,255,255,0.08)',
        },
        // 保留旧的 brand 色（过度用）
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#007AFF',
          600: '#007AFF',
          700: '#5856D6',
          800: '#5856D6',
          900: '#3730a3',
          950: '#1e1b4b',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        'ios': '24px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0,0,0,0.06)',
        'glass-lg': '0 16px 48px 0 rgba(0,0,0,0.08)',
        'glass-sm': '0 2px 12px 0 rgba(0,0,0,0.04)',
        'button': '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
        'button-hover': '0 4px 12px 0 rgba(0,0,0,0.12)',
      },
      letterSpacing: {
        'ios-title': '-0.022em',
        'ios-body': '-0.01em',
      },
    },
  },
  plugins: [],
};
