export type ThemeMode = 'light' | 'dark';

type ThemePalette = {
  accent: string;
  background: string;
  border: string;
  card: string;
  notification: string;
  onAccent: string;
  placeholder: string;
  primary: string;
  secondary: string;
  surface: string;
  surfaceRaised: string;
  text: string;
};

const LIGHT_THEME: ThemePalette = {
  accent: '#5E6AD2',
  background: '#F5F5F7',
  border: 'rgba(0,0,0,0.08)',
  card: '#F5F5F7',
  notification: '#FF4D4D',
  onAccent: '#FFFFFF',
  placeholder: '#6B6B7E',
  primary: '#0F0F14',
  secondary: '#6B6B7E',
  surface: '#FFFFFF',
  surfaceRaised: '#0F0F14',
  text: '#0F0F14',
};

const DARK_THEME: ThemePalette = {
  accent: '#5E6AD2',
  background: '#0F0F14',
  border: 'rgba(255,255,255,0.08)',
  card: '#0F0F14',
  notification: '#FF4D4D',
  onAccent: '#FFFFFF',
  placeholder: '#8B8B9E',
  primary: '#FFFFFF',
  secondary: '#8B8B9E',
  surface: '#1A1A24',
  surfaceRaised: '#FFFFFF',
  text: '#FFFFFF',
};

const SHARED_THEME_VARIABLES = {
  '--border-hairline': '1px',
  '--border-thick': '2px',
  '--border-thin': '1px',
  '--font-size-body': '16px',
  '--font-size-caption': '12px',
  '--font-size-display': '34px',
  '--font-size-heading': '20px',
  '--font-size-label': '14px',
  '--font-size-title': '24px',
  '--line-height-body': '24px',
  '--line-height-caption': '16px',
  '--line-height-display': '41px',
  '--line-height-heading': '28px',
  '--line-height-label': '20px',
  '--line-height-title': '32px',
  '--radius-card': '24px',
  '--radius-field': '16px',
  '--radius-pill': '999px',
  '--spacing-card-x': '16px',
  '--spacing-card-y': '20px',
  '--spacing-field-x': '16px',
  '--spacing-field-y': '14px',
  '--spacing-row-x': '16px',
  '--spacing-row-y': '16px',
} as const;

export function normalizeThemeMode(value: string | null | undefined): ThemeMode {
  return value === 'light' ? 'light' : 'dark';
}

export function getToggledThemeMode(themeMode: ThemeMode): ThemeMode {
  return themeMode === 'dark' ? 'light' : 'dark';
}

export function getThemePalette(themeMode: ThemeMode): ThemePalette {
  return themeMode === 'light' ? LIGHT_THEME : DARK_THEME;
}

export function getThemeVariables(themeMode: ThemeMode) {
  if (themeMode === 'light') {
    return {
      ...SHARED_THEME_VARIABLES,
      '--color-accent': '94 106 210',
      '--color-background': '245 245 247',
      '--color-divider': '0 0 0',
      '--color-down': '0 196 140',
      '--color-error': '255 77 77',
      '--color-on-accent': '255 255 255',
      '--color-primary': '15 15 20',
      '--color-secondary': '107 107 126',
      '--color-surface': '255 255 255',
      '--color-surface-raised': '15 15 20',
      '--color-up': '255 77 77',
    };
  }

  return {
    ...SHARED_THEME_VARIABLES,
    '--color-accent': '94 106 210',
    '--color-background': '15 15 20',
    '--color-divider': '255 255 255',
    '--color-down': '0 196 140',
    '--color-error': '255 77 77',
    '--color-on-accent': '255 255 255',
    '--color-primary': '255 255 255',
    '--color-secondary': '139 139 158',
    '--color-surface': '26 26 36',
    '--color-surface-raised': '255 255 255',
    '--color-up': '255 77 77',
  };
}
