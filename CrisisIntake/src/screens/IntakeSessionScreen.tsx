import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { useAppStore } from "../store/useAppStore";
import {
  AUDIO_PIPELINE_STT_MODEL,
  useAudioPipeline,
} from "../hooks/useAudioPipeline";
import { RecordingIndicator } from "../components/audio/RecordingIndicator";
import { StatusStrip } from "../components/audio/StatusStrip";
import { TranscriptTicker } from "../components/audio/TranscriptTicker";
import { IntakeForm } from "../components/form/IntakeForm";
import { CompletionBar } from "../components/form/CompletionBar";
import { theme } from "../theme";
import { CactusSTT } from "cactus-react-native";
import { IntakeSchema, FIELD_METADATA } from "../types/intake";
import { getExtractionEngine } from "../services/loadExtractionEngine";
import { sanitizeIntake } from "../services/sanitization";
import {
  clearQueuedSanitizedPayload,
  enqueueSanitizedPayload,
  generateResourcePlan,
} from "../services/gemini";

let sttPreloadPromise: Promise<void> | null = null;

type Nav = NativeStackNavigationProp<RootStackParamList, "IntakeSession">;

export function IntakeSessionScreen() {
  const navigation = useNavigation<Nav>();
  const pipeline = useAudioPipeline();
  const modelsLoaded = useAppStore(s => s.modelsLoaded);
  const setModelsLoaded = useAppStore(s => s.setModelsLoaded);
  const cloudStatus = useAppStore((s) => s.cloudStatus);
  const setCloudStatus = useAppStore((s) => s.setCloudStatus);
  const setCloudResult = useAppStore((s) => s.setCloudResult);

  // Register transcript callback — runs extraction silently, no popup
  useEffect(() => {
    pipeline.onTranscriptReady(async (transcript) => {
      useAppStore.getState().setPipelinePhase("extracting");
      let fieldsExtracted: string[] = [];
      try {
        const engine = await getExtractionEngine((model, progress) => {
          if (model === "llm") {
            useAppStore.getState().updateDownloadProgress("llm", progress);
          }
        });

        if (engine) {
          const delta = await engine.extractFromTranscript(
            transcript,
            () => useAppStore.getState().intake as IntakeSchema
          );

          if (delta) {
            const filteredDelta = Object.fromEntries(
              Object.entries(delta).filter(([key, value]) => {
                return Boolean(
                  FIELD_METADATA.find(m => m.key === key) &&
                    value !== null &&
                    value !== undefined &&
                    value !== ""
                );
              })
            ) as Partial<Record<keyof IntakeSchema, unknown>>;

            const extractedFieldKeys = Object.keys(filteredDelta) as Array<keyof IntakeSchema>;
            if (extractedFieldKeys.length > 0) {
              useAppStore.getState().mergeFields(
                filteredDelta as Partial<Record<keyof IntakeSchema, any>>,
                "voice"
              );
            }
            fieldsExtracted = extractedFieldKeys.map(f => f as string);
          }
        }
      } catch (error) {
        console.error("[IntakeSession] Extraction failed:", error);
      } finally {
        useAppStore.getState().commitTranscript({
          id: `${Date.now()}`,
          rawText: transcript,
          editedText: transcript,
          wasEdited: false,
          timestamp: Date.now(),
          fieldsExtracted,
        });
        useAppStore.getState().setPipelinePhase("listening");
      }
    });
  }, [pipeline]);

  useEffect(() => {
    const loadModels = async () => {
      try {
        if (!sttPreloadPromise) {
          sttPreloadPromise = (async () => {
            const stt = new CactusSTT({
              model: AUDIO_PIPELINE_STT_MODEL,
              options: { quantization: "int8", pro: false },
            });
            await stt.download({
              onProgress: (p) => useAppStore.getState().updateDownloadProgress("stt", p),
            });
          })().catch((error) => {
            sttPreloadPromise = null;
            throw error;
          });
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

  // Preload extraction engine
  useEffect(() => {
    getExtractionEngine((model, progress) => {
      if (model === "llm") {
        useAppStore.getState().updateDownloadProgress("llm", progress);
      }
    }).catch((error) => {
      console.warn("[IntakeSession] Extraction preload skipped:", error);
    });
  }, []);

  const handleGeneratePlan = async () => {
    if (cloudStatus === "sanitizing" || cloudStatus === "sending") {
      return;
    }

    const sanitized = sanitizeIntake(useAppStore.getState().intake);
    setCloudResult(null);
    setCloudStatus("sanitizing");
    navigation.navigate("ResourcePlan");

    try {
      setCloudStatus("sending");
      const result = await generateResourcePlan(sanitized);
      await clearQueuedSanitizedPayload();
      setCloudResult(result);
      setCloudStatus("complete");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isTransientNetworkError =
        /network request failed|failed to fetch|load failed|timed out/i.test(message);

      if (isTransientNetworkError) {
        await enqueueSanitizedPayload(sanitized);
        setCloudStatus("queued");
        return;
      }

      console.error("[IntakeSession] Plan generation failed:", error);
      setCloudStatus("error");
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.headerSafe}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>OASIS</Text>
            <Text style={styles.brandSub}>Voice Intake</Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              style={styles.scanButton}
              onPress={() => navigation.navigate("DocumentScan")}
            >
              <Text style={styles.scanButtonText}>Scan</Text>
            </Pressable>
            <RecordingIndicator />
            <Pressable
              style={[
                styles.micButton,
                pipeline.isListening && styles.micButtonActive,
              ]}
              onPress={() => pipeline.isListening ? pipeline.stopListening() : pipeline.startListening()}
            >
              <Text style={styles.micButtonText}>
                {pipeline.isListening ? "Stop" : "Listen"}
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <StatusStrip />

      {!modelsLoaded ? (
        <View style={styles.loading}>
          <Text style={{ ...theme.typography.body, color: theme.colors.textSecondary }}>
            Preparing models...
          </Text>
        </View>
      ) : (
        <View style={styles.body}>
          <TranscriptTicker />
          <IntakeForm />
          <CompletionBar onGeneratePlan={handleGeneratePlan} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerSafe: {
    backgroundColor: theme.colors.headerBg,
  },
  header: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandName: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 3,
    color: theme.colors.headerText,
  },
  brandSub: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.5,
    color: "rgba(255,255,255,0.7)",
    marginTop: 1,
  },
  body: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  scanButton: {
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radii.sm,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  scanButtonText: {
    ...theme.typography.caption,
    color: theme.colors.headerText,
    fontWeight: "600",
    fontSize: 12,
  },
  micButton: {
    paddingVertical: 7,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.full,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
  },
  micButtonActive: {
    backgroundColor: theme.colors.danger,
    borderColor: theme.colors.danger,
  },
  micButtonText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: "#FFFFFF",
  },
});
