/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['Figtree', 'sans-serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg:      '#080808',
        surface: '#101010',
        accent:  '#7c5cfc',
        teal:    '#00d4a0',
      },
    },
  },
  plugins: [],
};
