/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        up: 'rgb(var(--color-up) / <alpha-value>)',
        error: 'rgb(var(--color-error) / <alpha-value>)',
        down: 'rgb(var(--color-down) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        divider: 'rgb(var(--color-divider) / 0.08)',
      },
    },
  },
  plugins: [],
};
