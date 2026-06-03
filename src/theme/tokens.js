/**
 * NCDC Conference Management System — design tokens.
 * Primary green derived from ncdc.go.ug (#008e51).
 */
export const colors = {
  primary: {
    DEFAULT: "#008e51",
    dark: "#006941",
    light: "#e8f4ed",
    muted: "#d9e9c8",
    foreground: "#ffffff",
  },
  neutral: {
    50: "#f8f9fa",
    100: "#f1f3f5",
    200: "#e9ecef",
    300: "#dddfe3",
    400: "#abb8c3",
    500: "#627792",
    600: "#4c4c4c",
    700: "#32373c",
    800: "#313233",
    900: "#1a1a1a",
  },
  semantic: {
    success: "#15803d",
    warning: "#b45309",
    error: "#cf2e2e",
    info: "#0e2b5c",
  },
  surface: {
    DEFAULT: "#ffffff",
    subtle: "#f7f8f9",
    elevated: "#ffffff",
  },
};

export const typography = {
  fontFamily: {
    sans: "var(--font-geist-sans), system-ui, sans-serif",
    mono: "var(--font-geist-mono), ui-monospace, monospace",
  },
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeight: {
    tight: "1.25",
    normal: "1.5",
    relaxed: "1.625",
  },
};

export const spacing = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
  "3xl": "4rem",
};

export const radius = {
  sm: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  full: "9999px",
};

export const shadow = {
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05)",
};

export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadow,
  iconSize,
};

export default theme;
