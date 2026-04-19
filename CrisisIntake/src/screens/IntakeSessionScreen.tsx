import React, { useEffect } from "react";
import { View, Text, SafeAreaView, TouchableOpacity, StyleSheet } from "react-native";
import { useAppStore } from "../store/useAppStore";
import { AUDIO_PIPELINE_STT_MODEL, useAudioPipeline } from "../hooks/useAudioPipeline";
import { RecordingIndicator } from "../components/audio/RecordingIndicator";
import { TranscriptReviewSheet } from "../components/audio/TranscriptReviewSheet";
import { theme } from "../theme";
import { CactusSTT } from "cactus-react-native";

export function IntakeSessionScreen() {
  const pipeline = useAudioPipeline();
  const modelsLoaded = useAppStore(s => s.modelsLoaded);
  const setModelsLoaded = useAppStore(s => s.setModelsLoaded);
  
  // Download STT model on mount (VAD is energy-based, no model needed)
  useEffect(() => {
    const loadModels = async () => {
      try {
        const stt = new CactusSTT({
          model: AUDIO_PIPELINE_STT_MODEL,
          options: { quantization: "int8", pro: false },
        });

        console.log("Downloading STT model...");
        await stt.download({
          onProgress: (p) => useAppStore.getState().updateDownloadProgress("stt", p)
        });

        console.log("STT model downloaded!");
        setModelsLoaded(true);
      } catch (e) {
        console.error("Failed to load models:", e);
      }
    };

    if (!modelsLoaded) {
      loadModels();
    }
  }, [modelsLoaded, setModelsLoaded]);

  const handleTranscriptConfirmed = () => {
    console.log("Transcript confirmed");
    useAppStore.getState().clearCurrentTranscript();
    useAppStore.getState().setPipelinePhase("idle");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={styles.header}>
        <Text style={theme.typography.h2}>Crisis Intake</Text>
        <RecordingIndicator />
      </View>

      <View style={styles.content}>
        {!modelsLoaded ? (
          <>
            <Text style={theme.typography.body}>Downloading STT Model...</Text>
          </>
        ) : (
          <>
            <TouchableOpacity 
              style={[
                styles.button, 
                { backgroundColor: pipeline.isListening ? theme.colors.danger : theme.colors.accent }
              ]}
              onPress={() => pipeline.isListening ? pipeline.stopListening() : pipeline.startListening()}
            >
              <Text style={styles.buttonText}>
                {pipeline.isListening ? "Stop Listening" : "Start Listening"}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.stats}>
              <Text style={theme.typography.caption}>Speech: {pipeline.speechSeconds.toFixed(1)}s</Text>
              <Text style={theme.typography.caption}>Silence: {pipeline.silenceSeconds.toFixed(1)}s</Text>
            </View>

            <TouchableOpacity 
              style={[styles.button, { marginTop: theme.spacing.xl, backgroundColor: theme.colors.textMuted }]}
              onPress={() => useAppStore.getState().setCurrentTranscript("This is a test transcript to verify the review sheet UI.")}
            >
              <Text style={styles.buttonText}>Test Transcript UI</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <TranscriptReviewSheet onConfirm={handleTranscriptConfirmed} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  button: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radii.lg,
    ...theme.shadows.card,
  },
  buttonText: {
    ...theme.typography.h3,
    color: "#FFFFFF",
  },
  stats: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  }
});
