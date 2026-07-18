export const BREAKPOINTS = {
  xs: 480,
  sm: 768,
  md: 1024,
  lg: 1280,
  xl: 1440,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;
