import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../../theme";
import { TimelineEntry } from "../../types/cloud";

interface TimelineViewProps {
  entries: TimelineEntry[];
}

const CATEGORY_STYLES: Record<
  string,
  { background: string; text: string; border: string; label: string }
> = {
  housing: {
    background: "#EEF2FF",
    border: "#C7D2FE",
    text: "#4338CA",
    label: "Housing",
  },
  benefits: {
    background: theme.colors.fieldConfirmed,
    border: theme.colors.fieldConfirmedBorder,
    text: theme.colors.fieldConfirmedAccent,
    label: "Benefits",
  },
  legal: {
    background: theme.colors.fieldInferred,
    border: theme.colors.fieldInferredBorder,
    text: theme.colors.fieldInferredAccent,
    label: "Legal",
  },
  medical: {
    background: theme.colors.dangerLight,
    border: theme.colors.danger,
    text: theme.colors.danger,
    label: "Medical",
  },
};

function categoryStyle(category: string) {
  return (
    CATEGORY_STYLES[category?.toLowerCase?.() ?? ""] ?? {
      background: theme.colors.surface,
      border: theme.colors.fieldEmptyBorder,
      text: theme.colors.textSecondary,
      label: category ? category.charAt(0).toUpperCase() + category.slice(1) : "General",
    }
  );
}

/**
 * Vertical timeline: day marker circles connected by a line, action text,
 * and a category chip per entry.
 */
export function TimelineView({ entries }: TimelineViewProps) {
  if (!entries || entries.length === 0) {
    return (
      <Text style={styles.empty}>No actions recommended at this time.</Text>
    );
  }

  const sorted = [...entries].sort((a, b) => (a.day ?? 0) - (b.day ?? 0));

  return (
    <View style={styles.container}>
      {sorted.map((entry, idx) => {
        const isLast = idx === sorted.length - 1;
        const cat = categoryStyle(entry.category);

        return (
          <View key={`${entry.day}-${idx}`} style={styles.row}>
            <View style={styles.markerColumn}>
              <View style={styles.markerHalo}>
                <View style={styles.marker}>
                  <Text style={styles.markerText}>{entry.day}</Text>
                </View>
              </View>
              {!isLast && <View style={styles.connector} />}
            </View>

            <View style={styles.bodyCard}>
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.dayLabel}>Day {entry.day}</Text>
                  <Text style={styles.sequenceLabel}>
                    {idx === 0 ? "Immediate action" : `Step ${idx + 1}`}
                  </Text>
                </View>
                <View
                  style={[
                    styles.categoryChip,
                    { backgroundColor: cat.background, borderColor: cat.border },
                  ]}
                >
                  <Text style={[styles.categoryText, { color: cat.text }]}>
                    {cat.label}
                  </Text>
                </View>
              </View>
              <Text style={styles.action}>{entry.action}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const MARKER_SIZE = 34;

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: theme.spacing.md,
  },
  markerColumn: {
    alignItems: "center",
    width: MARKER_SIZE + 8,
  },
  markerHalo: {
    width: MARKER_SIZE + 8,
    height: MARKER_SIZE + 8,
    borderRadius: (MARKER_SIZE + 8) / 2,
    backgroundColor: theme.colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  marker: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    ...theme.shadows.card,
  },
  markerText: {
    color: theme.colors.background,
    fontWeight: "800",
    fontSize: 13,
  },
  connector: {
    flex: 1,
    width: 3,
    backgroundColor: theme.colors.accentLight,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    borderRadius: theme.radii.full,
  },
  bodyCard: {
    flex: 1,
    backgroundColor: "#FFFCF8",
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: "#E5DDD1",
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
    ...theme.shadows.card,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  dayLabel: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  sequenceLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  action: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    lineHeight: 23,
  },
  categoryChip: {
    alignSelf: "flex-start",
    paddingVertical: 5,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radii.full,
    borderWidth: 1,
  },
  categoryText: {
    ...theme.typography.caption,
  },
  empty: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    fontStyle: "italic",
    paddingVertical: theme.spacing.md,
  },
});
