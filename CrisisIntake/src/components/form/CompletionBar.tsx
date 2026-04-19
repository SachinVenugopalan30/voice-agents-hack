import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, Animated, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme";
import { useAppStore } from "../../store/useAppStore";
import { FIELD_METADATA } from "../../types/intake";

interface Props {
  onGeneratePlan: () => void;
}

export function CompletionBar({ onGeneratePlan }: Props) {
  const insets = useSafeAreaInsets();
  const intake = useAppStore((s) => s.intake);
  const cloudStatus = useAppStore((s) => s.cloudStatus);

  const nonEmpty = FIELD_METADATA.filter((m) => intake[m.key].status !== "empty").length;
  const confirmed = FIELD_METADATA.filter((m) => intake[m.key].status === "confirmed").length;
  const total = FIELD_METADATA.length;
  const pct = Math.round((nonEmpty / total) * 100);
  const isGenerating = cloudStatus === "sanitizing" || cloudStatus === "sending";
  const canGenerate = pct >= 70 && !isGenerating;

  const progressAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: pct / 100,
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  // Subtle pulse on button when it becomes available
  useEffect(() => {
    if (canGenerate) {
      Animated.sequence([
        Animated.timing(buttonScale, { toValue: 1.05, duration: 200, useNativeDriver: true }),
        Animated.spring(buttonScale, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
      ]).start();
    }
  }, [canGenerate]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + theme.spacing.sm }]}>
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: pct >= 70 ? theme.colors.accent : theme.colors.fieldInferredBorder,
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>

      {/* Stats + Button row */}
      <View style={styles.row}>
        {/* Stats cluster */}
        <View style={styles.statsRow}>
          <Text style={[
            styles.pctNumber,
            pct >= 70 && { color: theme.colors.accent },
          ]}>
            {pct}%
          </Text>
          <View style={styles.statsDivider} />
          <View>
            <Text style={styles.statsDetail}>
              {nonEmpty} filled {"\u00B7"} {confirmed} confirmed
            </Text>
            <Text style={styles.statsDetail}>
              {total - nonEmpty} remaining
            </Text>
          </View>
        </View>

        {/* Generate button */}
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <Pressable
            onPress={onGeneratePlan}
            disabled={!canGenerate}
            style={[
              styles.generateButton,
              canGenerate ? styles.generateButtonActive : styles.generateButtonDisabled,
            ]}
          >
            <Text style={styles.generateIcon}>
              {isGenerating ? "\u{23F3}" : "\u{2728}"}
            </Text>
            <Text style={[
              styles.generateText,
              !canGenerate && { color: theme.colors.textMuted },
            ]}>
              {isGenerating ? "Working..." : "Generate Plan"}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surface,
    ...theme.shadows.elevated,
  },
  progressTrack: {
    height: 5,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.full,
    marginBottom: theme.spacing.md,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: theme.radii.full,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  pctNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.textSecondary,
    letterSpacing: -0.8,
  },
  statsDivider: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.fieldEmptyBorder,
  },
  statsDetail: {
    fontSize: 11,
    fontWeight: "500",
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: theme.radii.full,
    gap: 6,
  },
  generateButtonActive: {
    backgroundColor: theme.colors.accent,
    ...theme.shadows.elevated,
  },
  generateButtonDisabled: {
    backgroundColor: theme.colors.surface,
  },
  generateIcon: {
    fontSize: 14,
  },
  generateText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
    color: "#FFFFFF",
  },
});
