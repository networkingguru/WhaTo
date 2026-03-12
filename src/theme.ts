export const colors = {
  background: '#1A1A2E',
  surface: '#16213E',
  primary: '#E94560',
  primaryLight: '#FF6B81',
  text: '#EAEAEA',
  textSecondary: '#A0A0B0',
  accent: '#0F3460',
  success: '#4CAF50',
  shadow: '#000000',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const typography = {
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: colors.text,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.text,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.text,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
} as const;

export const cardStyle = {
  borderRadius: 16,
  shadowColor: colors.shadow,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8,
} as const;
