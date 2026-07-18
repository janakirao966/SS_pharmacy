export const TYPOGRAPHY = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  displaySm: 40,
  displayLg: 56,
} as const;

export type FontSize = keyof typeof TYPOGRAPHY;
