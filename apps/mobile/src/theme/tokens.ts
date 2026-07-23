import { Platform } from "react-native";

/** The supplied brand palette. Black carries hierarchy; red is reserved for exceptions. */
export const colors = {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  ink: "#000000",
  inkMuted: "#5B5B5B",
  inkFaint: "#8F8F8F",
  line: "#E7E7E7",
  soft: "#F5F5F3",
  softDark: "#171717",
  error: "#B00020",
  onError: "#FFFFFF",
  success: "#157A45",
  warning: "#A85B00",
  info: "#2457D6",
};

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  pill: 999,
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const shadow = Platform.select({
  web: {
    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.08)",
  },
  default: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
});

export const font = {
  display: Platform.select({ ios: "Georgia", android: "serif", default: "Georgia" }),
  body: Platform.select({ ios: "System", android: "sans-serif", default: "Arial" }),
};
