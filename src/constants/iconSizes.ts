export const ICON_SIZES = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

export type IconSize = keyof typeof ICON_SIZES;
