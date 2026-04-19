import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { useAppStore } from "../../store/useAppStore";
import { theme } from "../../theme";

export function TranscriptTicker() {
  const transcriptLog = useAppStore((s) => s.transcriptLog);
  const currentTranscript = useAppStore((s) => s.currentTranscript);
  const phase = useAppStore((s) => s.pipelinePhase);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const latestEntry = transcriptLog.length > 0
    ? transcriptLog[transcriptLog.length - 1]
    : null;

  const displayText = phase === "transcribing"
    ? "Transcribing speech..."
    : phase === "extracting"
    ? "Extracting fields from transcript..."
    : currentTranscript || latestEntry?.rawText || null;

  const fieldsCount = latestEntry?.fieldsExtracted?.length ?? 0;

  useEffect(() => {
    if (displayText) {
      slideAnim.setValue(20);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [displayText]);

  if (!displayText) return null;

  const isProcessing = phase === "transcribing" || phase === "extracting";

  return (
    <Animated.View style={[
      styles.container,
      {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      },
    ]}>
      <View style={styles.iconCol}>
        <Text style={styles.quoteIcon}>{isProcessing ? "\u{2699}\u{FE0F}" : "\u{275D}"}</Text>
      </View>
      <View style={styles.textCol}>
        <Text style={[
          styles.transcript,
          isProcessing && styles.transcriptProcessing,
        ]} numberOfLines={2}>
          {displayText}
        </Text>
        {fieldsCount > 0 && !isProcessing && (
          <Text style={styles.fieldsExtracted}>
            {fieldsCount} field{fieldsCount !== 1 ? "s" : ""} extracted
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.fieldEmptyBorder,
    ...theme.shadows.card,
  },
  iconCol: {
    width: 28,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 2,
  },
  quoteIcon: {
    fontSize: 16,
    color: theme.colors.textMuted,
  },
  textCol: {
    flex: 1,
  },
  transcript: {
    fontSize: 13,
    fontWeight: "400",
    fontStyle: "italic",
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  transcriptProcessing: {
    fontStyle: "normal",
    fontWeight: "500",
    color: theme.colors.fieldInferredBorder,
  },
  fieldsExtracted: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.accent,
    marginTop: 4,
    letterSpacing: 0.2,
  },
});
