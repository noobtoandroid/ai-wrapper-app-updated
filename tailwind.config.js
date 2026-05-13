/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          100: '#e0e7ff',
          200: '#c7d2fe',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        surface: {
          100: '#f1f5f9',
          200: '#e2e8f0',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          850: '#172033',
          900: '#0f172a',
          950: '#080d1a',
        },
      },
      borderRadius: {
        bubble: '18px',
        'bubble-sm': '6px',
      },
      boxShadow: {
        bubble: '0 1px 2px rgba(0,0,0,0.2)',
        fab: '0 4px 12px rgba(0,0,0,0.3)',
      },
      backgroundColor: {
        'user-bubble': '#4338ca',
        'ai-bubble': '#1e293b',
      },
      textColor: {
        'user-text': '#ffffff',
        'ai-text': '#e2e8f0',
      },
    },
  },
  plugins: [],
}
