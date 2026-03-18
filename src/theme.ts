export const colors = {
  background: '#FFF8F0',
  surface: '#FFFFFF',
  primary: '#FF6B4A',
  primaryLight: '#FF8A6A',
  secondary: '#F5A623',
  tertiary: '#7B68EE',
  text: '#2D2D2D',
  textSecondary: '#8B7355',
  accent: '#7B68EE',
  success: '#4CAF50',
  danger: '#FF4444',
  connected: '#4A90D9',
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
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 8,
} as const;
