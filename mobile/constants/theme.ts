/**
 * Cyber-wellness design system — strict dark + neon-green palette.
 * Every color, spacing, radius, and shadow token lives here.
 */

export const theme = {
  colors: {
    background: {
      main: '#0F1412',
      secondary: '#1A211D',
      elevated: '#222B25',
    },
    green: {
      primary: '#39FF88',
      accent: '#2ECC71',
      soft: '#6EF3A5',
    },
    chart: {
      light: '#8BFFB7',
      medium: '#4ADE80',
      dark: '#1F8F55',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B5C2B8',
      muted: '#7D8B82',
    },
    ui: {
      divider: '#2F3A33',
      inactiveIcon: '#6B756F',
      activeIcon: '#39FF88',
    },
    error: '#FF5252',
  },
  gradients: {
    primary: ['#39FF88', '#1F8F55'] as [string, string],
    alternate: ['#4ADE80', '#22C55E'] as [string, string],
    mesh: ['#0F1412', '#162118', '#0F1412'] as [string, string, string],
    glow: ['rgba(57,255,136,0.15)', 'rgba(57,255,136,0)'] as [string, string],
  },
  buttons: {
    primary: {
      background: '#39FF88',
      text: '#0F1412',
    },
    secondary: {
      background: '#1A211D',
      border: '#39FF88',
      text: '#39FF88',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 12,
    md: 18,
    lg: 24,
    xl: 32,
    full: 999,
  },
  glow: {
    primary: {
      shadowColor: '#39FF88',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 8,
    },
    subtle: {
      shadowColor: '#39FF88',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 4,
    },
  },
} as const;
