export const colors = {
  // Neumorphic Soft Surface Palette (#e6ecf5 base)
  background: '#e6ecf5',
  backgroundSecondary: '#dde4ef',
  surface: '#e6ecf5',
  surfaceElevated: '#e6ecf5',
  surfaceHighlight: '#d5dde8',
  surfaceInset: '#dde4ee',

  // Borders & Dividers
  border: '#d5dde8',
  borderLight: '#ccd5e2',
  borderFocus: '#2563eb',

  // Accents & Brand: Blue
  primary: '#2563eb',       // Blue accent
  primaryDark: '#1d4ed8',
  primaryGlow: 'rgba(37, 99, 235, 0.18)',
  primaryMuted: 'rgba(37, 99, 235, 0.10)',

  indigo: '#2563eb',
  indigoGlow: 'rgba(37, 99, 235, 0.18)',

  // Statuses
  success: '#16a34a',
  successGlow: 'rgba(22, 163, 74, 0.15)',
  successDark: '#15803d',

  warning: '#d97706',
  warningGlow: 'rgba(217, 119, 6, 0.15)',

  danger: '#ef4444',
  dangerGlow: 'rgba(239, 68, 68, 0.18)',
  dangerDark: '#dc2626',

  info: '#2563eb',

  // Button tokens (Blue background with Black text)
  buttonBackground: '#2563eb',
  buttonText: '#000000',

  // Typography (Unslopped Slate Hierarchy)
  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#64748b',
  textDim: '#94a3b8',

  // Overlays & Glass
  glassBackground: 'rgba(230, 236, 245, 0.95)',
  glassBorder: 'rgba(37, 99, 235, 0.25)',
  overlay: 'rgba(15, 23, 42, 0.45)',
};

export const shadows = {
  sm: {
    shadowColor: '#a3b1c6',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#a3b1c6',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 4,
  },
  lg: {
    shadowColor: '#9ba9bf',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 0.75,
    shadowRadius: 16,
    elevation: 6,
  },
  neuCard: {
    shadowColor: '#a3b1c6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.65,
    shadowRadius: 12,
    elevation: 5,
  },
  neuBtn: {
    shadowColor: '#9ba9bf',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 3,
  },
  emergencyGlow: {
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryGlow: {
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
};
