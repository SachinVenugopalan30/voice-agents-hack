import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Animated, StyleSheet } from "react-native";
import { theme } from "../../theme";
import { FIELD_METADATA } from "../../types/intake";
import type { IntakeSchema } from "../../types/intake";
import { useAppStore } from "../../store/useAppStore";
import { FieldEditor } from "./FieldEditor";

interface Props {
  fieldKey: keyof IntakeSchema;
}

const SOURCE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  voice: { icon: "\u{1F399}", label: "Voice", color: "#60A5FA" },
  vision: { icon: "\u{1F4F7}", label: "Scanned", color: "#A78BFA" },
  manual: { icon: "\u{270F}\u{FE0F}", label: "Manual", color: theme.colors.textMuted },
};

function timeAgo(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function FormField({ fieldKey }: Props) {
  const field = useAppStore((s) => s.intake[fieldKey]);
  const confirmField = useAppStore((s) => s.confirmField);
  const unlockField = useAppStore((s) => s.unlockField);
  const meta = FIELD_METADATA.find((m) => m.key === fieldKey)!;

  const [editing, setEditing] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevStatusRef = useRef(field.status);

  // Pulse animation for inferred fields
  useEffect(() => {
    if (field.status === "inferred") {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.85, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 1200, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [field.status]);

  // Pop animation when field transitions from empty to filled
  useEffect(() => {
    if (prevStatusRef.current === "empty" && field.status === "inferred") {
      scaleAnim.setValue(0.95);
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
    prevStatusRef.current = field.status;
  }, [field.status]);

  function handlePress() {
    if (field.status === "empty") {
      setEditing(true);
    } else if (field.status === "inferred") {
      confirmField(fieldKey);
      setEditing(false);
    } else if (field.status === "confirmed") {
      unlockField(fieldKey);
      setEditing(true);
    }
  }

  function handleLongPress() {
    if (field.status === "inferred") {
      setEditing(true);
    }
  }

  const isConfirmed = field.status === "confirmed";
  const isInferred = field.status === "inferred";
  const isEmpty = field.status === "empty";

  const backgroundColor = isConfirmed
    ? theme.colors.fieldConfirmed
    : isInferred
    ? theme.colors.fieldInferred
    : theme.colors.fieldEmpty;

  const borderColor = isConfirmed
    ? theme.colors.fieldConfirmedBorder
    : isInferred
    ? theme.colors.fieldInferredBorder
    : theme.colors.fieldEmptyBorder;

  const shadowStyle = isInferred
    ? theme.shadows.glow
    : isConfirmed
    ? theme.shadows.card
    : {};

  const displayValue =
    field.value !== null && field.value !== undefined
      ? typeof field.value === "boolean"
        ? field.value ? "Yes" : "No"
        : String(field.value).replace(/_/g, " ")
      : null;

  const sourceConfig = field.source ? SOURCE_CONFIG[field.source] : null;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          opacity: isInferred ? pulseAnim : 1,
          transform: [{ scale: scaleAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        unstable_pressDelay={50}
        style={[
          styles.card,
          {
            backgroundColor,
            borderLeftWidth: !isEmpty ? 4 : 0,
            borderLeftColor: borderColor,
            borderWidth: isEmpty ? 1 : 0,
            borderColor: isEmpty ? borderColor : undefined,
          },
          shadowStyle,
        ]}
      >
        {/* Top row: label + badges */}
        <View style={styles.topRow}>
          <Text style={[
            styles.label,
            !isEmpty && { color: theme.colors.textSecondary },
          ]}>
            {meta.label}
          </Text>
          <View style={styles.badges}>
            {sourceConfig && !isEmpty && (
              <View style={[styles.sourceBadge, { backgroundColor: sourceConfig.color + "18" }]}>
                <Text style={styles.sourceIcon}>{sourceConfig.icon}</Text>
                <Text style={[styles.sourceLabel, { color: sourceConfig.color }]}>
                  {sourceConfig.label}
                </Text>
              </View>
            )}
            {isConfirmed && (
              <View style={styles.checkBadge}>
                <Text style={styles.checkIcon}>{"\u2713"}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Value */}
        {displayValue ? (
          <Text style={[
            styles.value,
            isConfirmed && { color: theme.colors.fieldConfirmedAccent },
          ]}>
            {displayValue}
          </Text>
        ) : (
          <Text style={styles.emptyValue}>{"\u2014"}</Text>
        )}

        {/* Bottom row: action hints + timestamp */}
        <View style={styles.bottomRow}>
          {isInferred && (
            <Text style={styles.tapHint}>Tap to confirm {"\u00B7"} Hold to edit</Text>
          )}
          {isEmpty && !editing && (
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                setEditing(true);
              }}
              style={styles.manualButton}
            >
              <Text style={styles.manualButtonText}>+ Enter manually</Text>
            </Pressable>
          )}
          {isConfirmed && (
            <Text style={styles.tapHint}>Tap to edit</Text>
          )}
          {!isEmpty && field.lastUpdatedAt > 0 && (
            <Text style={styles.timestamp}>{timeAgo(field.lastUpdatedAt)}</Text>
          )}
        </View>

        {/* Edit button for non-empty fields */}
        {!isEmpty && !editing && (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              if (isConfirmed) unlockField(fieldKey);
              setEditing(true);
            }}
            style={[styles.editButton, { borderColor }]}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
        )}

        {/* Inline editor */}
        {editing && (
          <FieldEditor
            fieldKey={fieldKey}
            currentValue={field.value}
            onSave={() => setEditing(false)}
          />
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: theme.spacing.sm,
  },
  card: {
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    flex: 1,
  },
  badges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
    gap: 3,
  },
  sourceIcon: {
    fontSize: 10,
  },
  sourceLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.fieldConfirmedAccent,
    alignItems: "center",
    justifyContent: "center",
  },
  checkIcon: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  emptyValue: {
    fontSize: 16,
    color: theme.colors.textMuted,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  tapHint: {
    fontSize: 10,
    fontWeight: "500",
    color: theme.colors.textMuted,
    letterSpacing: 0.2,
  },
  timestamp: {
    fontSize: 10,
    fontWeight: "400",
    color: theme.colors.textMuted,
  },
  manualButton: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.surface,
  },
  manualButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.accent,
    letterSpacing: 0.2,
  },
  editButton: {
    position: "absolute",
    top: theme.spacing.md,
    right: theme.spacing.md,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  editButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
});
