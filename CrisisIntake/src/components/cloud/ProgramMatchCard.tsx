import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../../theme";
import { ProgramMatch } from "../../types/cloud";

interface ProgramMatchCardProps {
  match: ProgramMatch;
  rank?: number;
}

type LikelihoodStyle = {
  label: string;
  background: string;
  border: string;
  text: string;
};

const LIKELIHOOD_STYLES: Record<ProgramMatch["likelihood"], LikelihoodStyle> = {
  likely: {
    label: "Likely",
    background: theme.colors.fieldConfirmed,
    border: theme.colors.fieldConfirmedBorder,
    text: theme.colors.fieldConfirmedAccent,
  },
  possible: {
    label: "Possible",
    background: theme.colors.fieldInferred,
    border: theme.colors.fieldInferredBorder,
    text: theme.colors.fieldInferredAccent,
  },
  unlikely: {
    label: "Unlikely",
    background: theme.colors.surface,
    border: theme.colors.fieldEmptyBorder,
    text: theme.colors.textSecondary,
  },
};

/**
 * Card for a single matched resource program: title, likelihood chip, and
 * a short human-readable reason the client qualifies (or doesn't).
 */
export const ProgramMatchCard: React.FC<ProgramMatchCardProps> = ({
  match,
  rank,
}) => {
  const style =
    LIKELIHOOD_STYLES[match.likelihood] ?? LIKELIHOOD_STYLES.possible;

  return (
    <View style={[styles.card, { borderColor: style.border }]}>
      <View style={[styles.accentBar, { backgroundColor: style.border }]} />
      <View style={styles.headerRow}>
        <View style={styles.titleCluster}>
          <View style={styles.rankAndMeta}>
            {typeof rank === "number" ? (
              <View style={styles.rankBadge}>
                <Text style={styles.rankBadgeText}>{rank + 1}</Text>
              </View>
            ) : null}
            <Text style={styles.metaLabel}>Program Match</Text>
          </View>
          <Text style={styles.name} numberOfLines={2}>
            {match.name}
          </Text>
        </View>
        <View
          style={[
            styles.chip,
            { backgroundColor: style.background, borderColor: style.border },
          ]}
        >
          <Text style={[styles.chipText, { color: style.text }]}>
            {style.label}
          </Text>
        </View>
      </View>
      <View style={styles.reasonBlock}>
        <Text style={styles.reasonLabel}>Qualification Rationale</Text>
        <Text style={styles.reason}>{match.reason}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFCF8",
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    ...theme.shadows.card,
    overflow: "hidden",
  },
  accentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  titleCluster: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  rankAndMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    fontWeight: "800",
  },
  metaLabel: {
    ...theme.typography.sectionHeader,
    color: theme.colors.textMuted,
  },
  name: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radii.full,
    borderWidth: 1,
  },
  chipText: {
    ...theme.typography.caption,
  },
  reasonBlock: {
    borderTopWidth: 1,
    borderTopColor: "#ECE3D7",
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  reasonLabel: {
    ...theme.typography.sectionHeader,
    color: theme.colors.textSecondary,
  },
  reason: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 21,
  },
});
