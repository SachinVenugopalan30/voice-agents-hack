import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../../theme";

interface RiskScoreBadgeProps {
  /** Integer 0-100. Values outside the range are clamped. */
  score: number;
}

type Band = {
  label: string;
  background: string;
  text: string;
  tint: string;
  ring: string;
};

function bandFor(score: number): Band {
  if (score <= 33) {
    return {
      label: "LOW RISK",
      background: theme.colors.riskLow,
      text: theme.colors.background,
      tint: "#E8F7EF",
      ring: "#A6D9BB",
    };
  }
  if (score <= 66) {
    return {
      label: "MODERATE RISK",
      background: theme.colors.riskMedium,
      text: theme.colors.background,
      tint: "#FFF4D6",
      ring: "#F2CF75",
    };
  }
  return {
    label: "HIGH RISK",
    background: theme.colors.riskHigh,
    text: theme.colors.background,
    tint: "#FCE8E5",
    ring: "#E7A198",
  };
}

/**
 * 120×120 circular badge summarising the Gemini-generated risk score.
 * Bands: 0-33 green, 34-66 amber, 67-100 red.
 */
export function RiskScoreBadge({ score }: RiskScoreBadgeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const band = bandFor(clamped);

  return (
    <View style={styles.container}>
      <View style={[styles.outerRing, { borderColor: band.ring, backgroundColor: band.tint }]}>
        <View
          style={[styles.circle, { backgroundColor: band.background }]}
          accessibilityRole="image"
          accessibilityLabel={`Risk score ${clamped} out of 100, ${band.label.toLowerCase()}`}
        >
          <Text style={[styles.score, { color: band.text }]}>{clamped}</Text>
          <Text style={[styles.scoreSuffix, { color: band.text }]}>/ 100</Text>
        </View>
      </View>
      <View style={[styles.labelPill, { backgroundColor: band.tint, borderColor: band.ring }]}>
        <Text style={[styles.label, { color: band.background }]}>{band.label}</Text>
      </View>
    </View>
  );
}

const SIZE = 126;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  outerRing: {
    width: SIZE + 22,
    height: SIZE + 22,
    borderRadius: (SIZE + 22) / 2,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadows.glow,
  },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.2)",
    ...theme.shadows.elevated,
  },
  score: {
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -1.4,
    lineHeight: 48,
  },
  scoreSuffix: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.9,
    marginTop: 3,
  },
  labelPill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
    borderWidth: 1,
  },
  label: {
    ...theme.typography.sectionHeader,
  },
});
