export const colors = {
  // Backgrounds
  background: '#070a13',
  backgroundSecondary: '#0d1322',
  surface: '#111a2e',
  surfaceElevated: '#17223b',
  surfaceHighlight: '#1f2d4d',

  // Borders
  border: '#1a2744',
  borderLight: '#243459',
  borderFocus: '#38bdf8',

  // Accents & Brand
  primary: '#38bdf8',       // Sky blue accent
  primaryDark: '#0284c7',
  primaryGlow: 'rgba(56, 189, 248, 0.18)',
  primaryMuted: 'rgba(56, 189, 248, 0.10)',

  indigo: '#6366f1',
  indigoGlow: 'rgba(99, 102, 241, 0.18)',

  // Statuses
  success: '#10b981',       // Emerald
  successGlow: 'rgba(16, 185, 129, 0.18)',
  successDark: '#059669',

  warning: '#f59e0b',       // Amber
  warningGlow: 'rgba(245, 158, 11, 0.18)',

  danger: '#ef4444',        // Red / SOS
  dangerGlow: 'rgba(239, 68, 68, 0.25)',
  dangerDark: '#dc2626',

  info: '#06b6d4',          // Cyan

  // Typography
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textDim: '#475569',

  // Overlays & Glass
  glassBackground: 'rgba(15, 23, 42, 0.82)',
  glassBorder: 'rgba(56, 189, 248, 0.15)',
  overlay: 'rgba(0, 0, 0, 0.75)',
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  emergencyGlow: {
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
  },
  primaryGlow: {
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
};
