export const colors = {
  // Pure White Theme Backgrounds
  background: '#ffffff',
  backgroundSecondary: '#f8fafc',
  surface: '#ffffff',
  surfaceElevated: '#f1f5f9',
  surfaceHighlight: '#e2e8f0',

  // Borders
  border: '#e2e8f0',
  borderLight: '#cbd5e1',
  borderFocus: '#2563eb',

  // Accents & Brand: Blue
  primary: '#2563eb',       // Blue accent
  primaryDark: '#1d4ed8',
  primaryGlow: 'rgba(37, 99, 235, 0.18)',
  primaryMuted: 'rgba(37, 99, 235, 0.10)',

  indigo: '#2563eb',
  indigoGlow: 'rgba(37, 99, 235, 0.18)',

  // Statuses (Clean Blue / Black / White palette)
  success: '#2563eb',
  successGlow: 'rgba(37, 99, 235, 0.15)',
  successDark: '#1d4ed8',

  warning: '#2563eb',
  warningGlow: 'rgba(37, 99, 235, 0.15)',

  danger: '#2563eb',
  dangerGlow: 'rgba(37, 99, 235, 0.18)',
  dangerDark: '#1d4ed8',

  info: '#2563eb',

  // Button tokens
  buttonBackground: '#2563eb', // Blue button background
  buttonText: '#000000',       // Black button text

  // Typography (Dark / Black on White)
  textPrimary: '#000000',      // Pure black text
  textSecondary: '#1e293b',
  textMuted: '#64748b',
  textDim: '#94a3b8',

  // Overlays & Glass
  glassBackground: 'rgba(255, 255, 255, 0.95)',
  glassBorder: 'rgba(37, 99, 235, 0.25)',
  overlay: 'rgba(0, 0, 0, 0.4)',
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  emergencyGlow: {
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryGlow: {
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
};
