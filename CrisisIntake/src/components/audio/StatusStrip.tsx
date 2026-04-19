import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { useAppStore } from "../../store/useAppStore";
import { theme } from "../../theme";
import { FIELD_METADATA } from "../../types/intake";

const PHASE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  idle: { label: "Ready", color: theme.colors.textMuted, icon: "\u{23F8}" },
  listening: { label: "Listening", color: "#FF6B6B", icon: "\u{1F534}" },
  transcribing: { label: "Transcribing", color: "#60A5FA", icon: "\u{1F4DD}" },
  extracting: { label: "Extracting", color: theme.colors.fieldInferredBorder, icon: "\u{2699}\u{FE0F}" },
  scanning: { label: "Scanning", color: "#A78BFA", icon: "\u{1F4F7}" },
};

export function StatusStrip() {
  const phase = useAppStore((s) => s.pipelinePhase);
  const intake = useAppStore((s) => s.intake);
  const transcriptLog = useAppStore((s) => s.transcriptLog);

  const dotAnim = useRef(new Animated.Value(0)).current;

  const filled = FIELD_METADATA.filter((m) => intake[m.key].status !== "empty").length;
  const confirmed = FIELD_METADATA.filter((m) => intake[m.key].status === "confirmed").length;
  const total = FIELD_METADATA.length;

  const config = PHASE_CONFIG[phase] || PHASE_CONFIG.idle;

  useEffect(() => {
    if (phase === "listening") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(dotAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      dotAnim.setValue(0);
    }
  }, [phase]);

  return (
    <View style={styles.container}>
      {/* Pipeline status */}
      <View style={styles.statusChip}>
        <Animated.Text style={[
          styles.statusDot,
          { opacity: phase === "listening" ? dotAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.4, 1],
          }) : 1 }
        ]}>
          {config.icon}
        </Animated.Text>
        <Text style={[styles.statusLabel, { color: config.color }]}>
          {config.label}
        </Text>
      </View>

      {/* Privacy badge */}
      <View style={styles.privacyBadge}>
        <Text style={styles.privacyIcon}>{"\u{1F512}"}</Text>
        <Text style={styles.privacyText}>On-Device</Text>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{filled}</Text>
          <Text style={styles.statLabel}>filled</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: theme.colors.fieldConfirmedAccent }]}>
            {confirmed}
          </Text>
          <Text style={styles.statLabel}>confirmed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{transcriptLog.length}</Text>
          <Text style={styles.statLabel}>segments</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.fieldEmptyBorder,
    gap: theme.spacing.sm,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radii.full,
    gap: 4,
  },
  statusDot: {
    fontSize: 10,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  privacyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F5F0",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: theme.radii.full,
    gap: 3,
  },
  privacyIcon: {
    fontSize: 10,
  },
  privacyText: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.accent,
    letterSpacing: 0.2,
  },
  stats: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  stat: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "500",
    color: theme.colors.textMuted,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: theme.colors.fieldEmptyBorder,
  },
});
