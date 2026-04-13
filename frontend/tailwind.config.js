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
        'surface-raised': 'rgb(var(--color-surface-raised) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        up: 'rgb(var(--color-up) / <alpha-value>)',
        error: 'rgb(var(--color-error) / <alpha-value>)',
        down: 'rgb(var(--color-down) / <alpha-value>)',
        'on-accent': 'rgb(var(--color-on-accent) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        divider: 'rgb(var(--color-divider) / 0.08)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        field: 'var(--radius-field)',
        pill: 'var(--radius-pill)',
      },
      borderWidth: {
        hairline: 'var(--border-hairline)',
        thin: 'var(--border-thin)',
        thick: 'var(--border-thick)',
      },
      fontSize: {
        display: ['var(--font-size-display)', { lineHeight: 'var(--line-height-display)' }],
        title: ['var(--font-size-title)', { lineHeight: 'var(--line-height-title)' }],
        heading: ['var(--font-size-heading)', { lineHeight: 'var(--line-height-heading)' }],
        body: ['var(--font-size-body)', { lineHeight: 'var(--line-height-body)' }],
        label: ['var(--font-size-label)', { lineHeight: 'var(--line-height-label)' }],
        caption: ['var(--font-size-caption)', { lineHeight: 'var(--line-height-caption)' }],
      },
      spacing: {
        'card-x': 'var(--spacing-card-x)',
        'card-y': 'var(--spacing-card-y)',
        'field-x': 'var(--spacing-field-x)',
        'field-y': 'var(--spacing-field-y)',
        'row-x': 'var(--spacing-row-x)',
        'row-y': 'var(--spacing-row-y)',
      },
    },
  },
  plugins: [],
};
