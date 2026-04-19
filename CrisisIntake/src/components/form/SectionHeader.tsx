import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { theme } from "../../theme";

const SECTION_ICONS: Record<string, string> = {
  demographics: "\u{1F464}",
  family: "\u{1F46A}",
  housing: "\u{1F3E0}",
  income: "\u{1F4B0}",
  benefits: "\u{1F4CB}",
  health: "\u{2695}\u{FE0F}",
  safety: "\u{1F6E1}\u{FE0F}",
  needs: "\u{26A1}",
};

const SECTION_LABELS: Record<string, string> = {
  demographics: "Demographics",
  family: "Family & Dependents",
  housing: "Housing",
  income: "Income & Employment",
  benefits: "Benefits",
  health: "Health",
  safety: "Safety",
  needs: "Urgency & Needs",
};

interface Props {
  title: string;
  filled: number;
  total: number;
}

export function SectionHeader({ title, filled, total }: Props) {
  const allFilled = filled === total && total > 0;
  const icon = SECTION_ICONS[title] || "\u{1F4C4}";
  const label = SECTION_LABELS[title] || title;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: total > 0 ? filled / total : 0,
      tension: 40,
      friction: 10,
      useNativeDriver: false,
    }).start();
  }, [filled, total]);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.labelRow}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={[
            styles.title,
            allFilled && { color: theme.colors.fieldConfirmedAccent },
          ]}>
            {label}
          </Text>
        </View>
        <View style={[
          styles.countPill,
          allFilled && { backgroundColor: theme.colors.fieldConfirmed },
        ]}>
          <Text style={[
            styles.countText,
            allFilled && { color: theme.colors.fieldConfirmedAccent },
          ]}>
            {filled}/{total}
          </Text>
          {allFilled && (
            <Text style={styles.completeCheck}> {"\u2713"}</Text>
          )}
        </View>
      </View>

      {/* Mini progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: allFilled
                ? theme.colors.fieldConfirmedAccent
                : filled > 0
                ? theme.colors.fieldInferredBorder
                : theme.colors.fieldEmptyBorder,
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  icon: {
    fontSize: 14,
  },
  title: {
    ...theme.typography.sectionHeader,
    color: theme.colors.textMuted,
  },
  countPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.full,
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
    letterSpacing: 0.3,
  },
  completeCheck: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.fieldConfirmedAccent,
  },
  progressTrack: {
    height: 3,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: theme.radii.full,
  },
});
