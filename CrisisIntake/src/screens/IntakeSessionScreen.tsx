import React, { useEffect } from "react";
import { View, Text, SafeAreaView, TouchableOpacity, StyleSheet } from "react-native";
import { useAppStore } from "../store/useAppStore";
import { AUDIO_PIPELINE_STT_MODEL, useAudioPipeline } from "../hooks/useAudioPipeline";
import { RecordingIndicator } from "../components/audio/RecordingIndicator";
import { TranscriptReviewSheet } from "../components/audio/TranscriptReviewSheet";
import { theme } from "../theme";
import { CactusSTT } from "cactus-react-native";
import { IntakeSchema } from "../types/intake";
import { getExtractionEngine } from "../services/loadExtractionEngine";

const AUTO_RESUME_DELAY_MS = 350;
let sttPreloadPromise: Promise<void> | null = null;

export function IntakeSessionScreen() {
  const pipeline = useAudioPipeline();
  const modelsLoaded = useAppStore(s => s.modelsLoaded);
  const setModelsLoaded = useAppStore(s => s.setModelsLoaded);
  const currentTranscript = useAppStore(s => s.currentTranscript);
  const intake = useAppStore(s => s.intake);
  
  // Download STT model on mount (VAD is energy-based, no model needed)
  useEffect(() => {
    const loadModels = async () => {
      try {
        if (!sttPreloadPromise) {
          console.log("[Startup] Creating STT preload promise");
          sttPreloadPromise = (async () => {
            const stt = new CactusSTT({
              model: AUDIO_PIPELINE_STT_MODEL,
              options: { quantization: "int8", pro: false },
            });

            console.log("[Startup] Downloading STT model...");
            await stt.download({
              onProgress: (p) => useAppStore.getState().updateDownloadProgress("stt", p)
            });

            console.log("[Startup] STT model downloaded");
          })().catch((error) => {
            sttPreloadPromise = null;
            throw error;
          });
        } else {
          console.log("[Startup] Reusing existing STT preload promise");
        }

        await sttPreloadPromise;
        setModelsLoaded(true);
      } catch (e) {
        console.error("[Startup] Failed to load STT model:", e);
      }
    };

    if (!modelsLoaded) {
      loadModels();
    }
  }, [modelsLoaded, setModelsLoaded]);

  useEffect(() => {
    console.log("[Startup] Requesting Gemma preload");
    getExtractionEngine((model, progress) => {
      if (model === "llm") {
        useAppStore.getState().updateDownloadProgress("llm", progress);
      }
    }).catch((error) => {
      console.warn("[IntakeSession] Extraction preload skipped:", error);
    });
  }, []);

  const handleTranscriptConfirmed = async (editedText: string) => {
    const rawText = currentTranscript ?? editedText;
    const wasEdited = rawText !== editedText;
    let fieldsExtracted: string[] = [];

    console.log(
      `[ExtractionPipeline] Confirmed transcript. rawLength=${rawText.length} editedLength=${editedText.length} wasEdited=${wasEdited} text="${editedText.slice(0, 160)}"`
    );
    useAppStore.getState().clearCurrentTranscript();
    useAppStore.getState().setPipelinePhase("extracting");

    try {
      const engine = await getExtractionEngine((model, progress) => {
        if (model === "llm") {
          useAppStore.getState().updateDownloadProgress("llm", progress);
        }
      });

      if (!engine) {
        console.warn("[ExtractionPipeline] Extraction engine unavailable");
        console.warn("[IntakeSession] Extraction engine unavailable; skipping merge");
      } else {
        console.log(
          `[ExtractionPipeline] Engine ready=${engine.isReady?.() ?? "unknown"}. Starting extractFromTranscript()`
        );
        const delta = await engine.extractFromTranscript(
          editedText,
          intake as IntakeSchema
        );

        console.log("[ExtractionPipeline] Raw extraction delta:", delta);
        if (delta) {
          const filteredDelta = Object.fromEntries(
            Object.entries(delta).filter(([key, value]) => {
              return Boolean(
                intake[key as keyof IntakeSchema] &&
                  value !== null &&
                  value !== undefined &&
                  value !== ""
              );
            })
          ) as Partial<Record<keyof IntakeSchema, unknown>>;

          const extractedFieldKeys = Object.keys(filteredDelta) as Array<keyof IntakeSchema>;
          console.log(
            `[ExtractionPipeline] Filtered extraction fields: ${extractedFieldKeys.join(", ") || "none"}`
          );

          if (extractedFieldKeys.length > 0) {
            console.log("[ExtractionPipeline] Applying merged voice fields:", filteredDelta);
            useAppStore
              .getState()
              .mergeFields(
                filteredDelta as Partial<Record<keyof IntakeSchema, any>>,
                "voice"
              );
          } else {
            console.log("[ExtractionPipeline] No valid fields to merge");
          }

          fieldsExtracted = extractedFieldKeys.map((field) => field as string);
        } else {
          console.log("[ExtractionPipeline] Extraction returned null delta");
        }
      }
    } catch (error) {
      console.error("[ExtractionPipeline] Extraction failed:", error);
      console.error("[IntakeSession] Transcript extraction failed:", error);
    } finally {
      console.log(
        `[ExtractionPipeline] Extraction complete. fieldsExtracted=${fieldsExtracted.join(", ") || "none"}`
      );
      useAppStore.getState().commitTranscript({
        id: `${Date.now()}`,
        rawText,
        editedText,
        wasEdited,
        timestamp: Date.now(),
        fieldsExtracted,
      });
      useAppStore.getState().setPipelinePhase("idle");
      await new Promise((resolve) => setTimeout(resolve, AUTO_RESUME_DELAY_MS));
      console.log("[ExtractionPipeline] Restarting listening after extraction");
      pipeline.startListening().catch((error) => {
        console.warn("[ExtractionPipeline] Auto-resume failed:", error);
        console.warn("[IntakeSession] Failed to resume listening:", error);
      });
    }
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
