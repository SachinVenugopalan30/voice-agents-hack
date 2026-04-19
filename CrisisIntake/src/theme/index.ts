export const theme = {
  colors: {
    // Field states — the core visual language
    fieldEmpty: "#F5F0E8",
    fieldEmptyBorder: "#DDD5C8",
    fieldInferred: "#FFF7E0",
    fieldInferredBorder: "#E8A817",
    fieldInferredAccent: "#C48A00",
    fieldConfirmed: "#E6F7ED",
    fieldConfirmedBorder: "#1FAD5F",
    fieldConfirmedAccent: "#0D8A45",

    // Canvas
    background: "#FAF7F2",
    surface: "#F0EBE3",
    textPrimary: "#1A1612",
    textSecondary: "#5C524A",
    textMuted: "#9B8E82",

    // Accent — deep teal (the "oasis" water)
    accent: "#0E7C6B",
    accentLight: "#E0F5F0",
    danger: "#D44332",
    dangerLight: "#FDEAE7",

    // Risk badges
    riskLow: "#1FAD5F",
    riskMedium: "#E8A817",
    riskHigh: "#D44332",

    // Header
    headerBg: "#0E7C6B",
    headerText: "#FFFFFF",
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  radii: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  typography: {
    h1: { fontSize: 30, fontWeight: "800" as const, letterSpacing: -0.8 },
    h2: { fontSize: 24, fontWeight: "700" as const, letterSpacing: -0.4 },
    h3: { fontSize: 17, fontWeight: "600" as const },
    body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 22 },
    caption: { fontSize: 13, fontWeight: "500" as const, letterSpacing: 0.3 },
    sectionHeader: {
      fontSize: 11,
      fontWeight: "700" as const,
      letterSpacing: 1.5,
      textTransform: "uppercase" as const,
    },
  },

  shadows: {
    card: {
      shadowColor: "#1A1612",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    elevated: {
      shadowColor: "#1A1612",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 6,
    },
    glow: {
      shadowColor: "#E8A817",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 4,
    },
  },
};
