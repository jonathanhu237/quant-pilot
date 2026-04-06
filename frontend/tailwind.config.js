/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#0F0F14',
        surface: '#1A1A24',
        primary: '#FFFFFF',
        secondary: '#8B8B9E',
        up: '#FF4D4D',
        error: '#FF4D4D',
        down: '#00C48C',
        accent: '#5E6AD2',
        divider: 'rgba(255,255,255,0.08)',
      },
    },
  },
  plugins: [],
};
