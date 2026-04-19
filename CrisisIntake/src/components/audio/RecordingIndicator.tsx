import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { useAppStore } from "../../store/useAppStore";
import { theme } from "../../theme";

export function RecordingIndicator() {
  const phase = useAppStore(s => s.pipelinePhase);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (phase === "listening") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [phase, pulseAnim]);

  if (phase === "idle") return null;

  return (
    <View style={styles.container}>
      {phase === "listening" && (
        <>
          <Animated.View style={[
            styles.dot,
            { opacity: pulseAnim }
          ]} />
          <Text style={styles.text}>Listening</Text>
        </>
      )}
      {phase === "transcribing" && (
        <Text style={[styles.text, styles.textActive]}>Transcribing</Text>
      )}
      {phase === "extracting" && (
        <Text style={[styles.text, { color: "#FCD34D" }]}>Extracting</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: theme.radii.full,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: theme.radii.full,
    backgroundColor: "#FF6B6B",
    marginRight: 6,
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
    color: "rgba(255,255,255,0.8)",
  },
  textActive: {
    color: "#FFFFFF",
  },
});
