import { useRef, useCallback, useState, useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { CactusSTT } from "cactus-react-native";
import { AudioRecorder, AudioManager } from "react-native-audio-api";

export const AUDIO_PIPELINE_STT_MODEL = "whisper-small";

const VAD_SPEECH_START_RMS_THRESHOLD = 0.028;
const VAD_SPEECH_END_RMS_THRESHOLD = 0.016;
const TARGET_SAMPLE_RATE = 16000;
const CALLBACK_CHUNK_SECONDS = 0.1;
const MAX_BUFFER_SECONDS = 24;
const MIN_SPEECH_SECONDS_TO_TRIGGER = 2.0;
const SILENCE_SECONDS_TO_TRIGGER = 2.0;
const MAX_SPEECH_SECONDS_TO_TRIGGER = 20.0;
const SPEECH_REENTRY_CONSECUTIVE_CHUNKS = 2;
const SILENCE_RESET_CONSECUTIVE_SPEECH_CHUNKS = 4;

export function useAudioPipeline() {
  const [isListening, setIsListening] = useState(false);
  const ringBuffer = useRef<number[]>([]);
  const callbackRef = useRef<((transcript: string) => void) | null>(null);
  const isListeningRef = useRef(false);
  const captureSampleRateRef = useRef(TARGET_SAMPLE_RATE);
  const speechActiveRef = useRef(false);
  const speechCandidateChunksRef = useRef(0);
  const silenceResetCandidateChunksRef = useRef(0);
  const recorderPausedRef = useRef(false);

  const speechSeconds = useAppStore((s) => s.speechSeconds);
  const silenceSeconds = useAppStore((s) => s.silenceSeconds);
  const modelsLoaded = useAppStore((s) => s.modelsLoaded);

  const stt = useRef(
    new CactusSTT({
      model: AUDIO_PIPELINE_STT_MODEL,
      options: { quantization: "int8", pro: false },
    })
  );
  const sttReady = useRef(false);
  const recorder = useRef<AudioRecorder | null>(null);
  const processingRef = useRef(false);

  const stopCapture = useCallback((nextPhase: "idle" | "reviewing" = "idle") => {
    const currentRecorder = recorder.current;
    if (currentRecorder) {
      currentRecorder.clearOnAudioReady();

      if (currentRecorder.isRecording() || recorderPausedRef.current) {
        const result = currentRecorder.stop();
        if (result.status === "error") {
          console.warn("[AudioPipeline] Recorder stop failed:", result.message);
        }
      }
    }

    ringBuffer.current = [];
    processingRef.current = false;
    isListeningRef.current = false;
    speechActiveRef.current = false;
    speechCandidateChunksRef.current = 0;
    silenceResetCandidateChunksRef.current = 0;
    recorderPausedRef.current = false;
    setIsListening(false);
    useAppStore.getState().resetAudioCounters();
    useAppStore.getState().setPipelinePhase(nextPhase);

    AudioManager.setAudioSessionActivity(false).catch((error) => {
      console.warn("[AudioPipeline] Failed to deactivate audio session:", error);
    });
  }, []);

  const processTranscript = useCallback(async () => {
    if (ringBuffer.current.length === 0 || processingRef.current) {
      return;
    }

    processingRef.current = true;

    const audioToTranscribe = ringBuffer.current.slice();
    const sourceSampleRate = captureSampleRateRef.current;
    const durationSecs = (audioToTranscribe.length / sourceSampleRate).toFixed(1);

    ringBuffer.current = [];
    useAppStore.getState().resetAudioCounters();
    useAppStore.getState().setPipelinePhase("transcribing");

    if (recorder.current?.isRecording()) {
      recorder.current.pause();
      recorderPausedRef.current = true;
    }

    console.log(
      `[AudioPipeline] Processing transcript from ${audioToTranscribe.length} samples (${durationSecs}s @ ${sourceSampleRate}Hz)`
    );

    let shouldResumeListening = true;

    try {
      if (!sttReady.current) {
        await stt.current.init();
        sttReady.current = true;
      }

      let normalizedAudio = audioToTranscribe;
      if (sourceSampleRate !== TARGET_SAMPLE_RATE) {
        const ratio = sourceSampleRate / TARGET_SAMPLE_RATE;
        const resampledLength = Math.max(1, Math.floor(audioToTranscribe.length / ratio));
        normalizedAudio = new Array(resampledLength);

        for (let i = 0; i < resampledLength; i += 1) {
          const sourceIndex = i * ratio;
          const index = Math.floor(sourceIndex);
          const fraction = sourceIndex - index;
          const a = audioToTranscribe[index] ?? 0;
          const b = audioToTranscribe[index + 1] ?? a;
          normalizedAudio[i] = a + (b - a) * fraction;
        }

        console.log(
          `[AudioPipeline] Resampled ${audioToTranscribe.length} @ ${sourceSampleRate}Hz -> ${normalizedAudio.length} @ ${TARGET_SAMPLE_RATE}Hz`
        );
      }

      let peak = 0;
      for (let i = 0; i < normalizedAudio.length; i += 1) {
        const absValue = Math.abs(normalizedAudio[i] ?? 0);
        if (absValue > peak) {
          peak = absValue;
        }
      }

      if (peak > 0.001) {
        const gain = 0.9 / peak;
        for (let i = 0; i < normalizedAudio.length; i += 1) {
          normalizedAudio[i] *= gain;
        }
        console.log(
          `[AudioPipeline] Normalized audio with peak=${peak.toFixed(4)} gain=${gain.toFixed(1)}x`
        );
      }

      const numSamples = normalizedAudio.length;
      const pcmBytes = new Uint8Array(numSamples * 2);
      const pcmView = new DataView(pcmBytes.buffer);

      for (let i = 0; i < numSamples; i += 1) {
        const s = Math.max(-1, Math.min(1, normalizedAudio[i] ?? 0));
        const int16Val = s < 0 ? s * 0x8000 : s * 0x7FFF;
        pcmView.setInt16(i * 2, int16Val, true);
      }

      const audioBytes: number[] = new Array(pcmBytes.length);
      for (let i = 0; i < pcmBytes.length; i += 1) {
        audioBytes[i] = pcmBytes[i];
      }

      console.log(
        `[AudioPipeline] Sending ${audioBytes.length} PCM bytes (${numSamples} samples, ${(numSamples / TARGET_SAMPLE_RATE).toFixed(1)}s)`
      );

      const result = await stt.current.transcribe({
        audio: audioBytes,
        options: {
          useVad: true,
        },
        onToken: (token) => {
          console.log(`[AudioPipeline] Token: "${token}"`);
        },
      });

      console.log("[AudioPipeline] STT result:", JSON.stringify(result).slice(0, 400));

      if (result.success && result.response.trim().length > 0) {
        console.log("[AudioPipeline] Transcript:", result.response);
        useAppStore.getState().setCurrentTranscript(result.response);
        if (callbackRef.current) {
          callbackRef.current(result.response);
        }

        shouldResumeListening = false;
        stopCapture("reviewing");
      } else {
        console.warn("[AudioPipeline] STT returned empty/failed result");
        useAppStore.getState().setPipelinePhase("listening");
      }
    } catch (error) {
      console.error("[AudioPipeline] STT failed:", error);
      useAppStore.getState().setPipelinePhase("listening");
    } finally {
      processingRef.current = false;

      if (
        shouldResumeListening &&
        isListeningRef.current &&
        recorderPausedRef.current &&
        recorder.current
      ) {
        recorder.current.resume();
        recorderPausedRef.current = false;
      }
    }
  }, [stopCapture]);

  const setupAudioProcess = useCallback(() => {
    if (!recorder.current) {
      return;
    }

    console.log("[AudioPipeline] Setting up onAudioReady callback");
    const result = recorder.current.onAudioReady(
      {
        sampleRate: TARGET_SAMPLE_RATE,
        bufferLength: Math.round(TARGET_SAMPLE_RATE * CALLBACK_CHUNK_SECONDS),
        channelCount: 1,
      },
      (event) => {
        const inputData = event.buffer.getChannelData(0);
        const sampleRate = event.buffer.sampleRate || TARGET_SAMPLE_RATE;
        captureSampleRateRef.current = sampleRate;

        if (ringBuffer.current.length === 0) {
          console.log(
            `[AudioPipeline] Audio callback sampleRate=${sampleRate}, frames=${inputData.length}`
          );
        }

        for (let i = 0; i < inputData.length; i += 1) {
          ringBuffer.current.push(inputData[i] ?? 0);
        }

        const maxSamples = Math.round(sampleRate * MAX_BUFFER_SECONDS);
        if (ringBuffer.current.length > maxSamples) {
          ringBuffer.current.splice(0, ringBuffer.current.length - maxSamples);
        }

        let sumSquares = 0;
        for (let i = 0; i < inputData.length; i += 1) {
          const sample = inputData[i] ?? 0;
          sumSquares += sample * sample;
        }
        const rms = Math.sqrt(sumSquares / inputData.length);
        let hasSpeech: boolean;
        if (speechActiveRef.current) {
          hasSpeech = rms > VAD_SPEECH_END_RMS_THRESHOLD;
          if (!hasSpeech) {
            speechCandidateChunksRef.current = 0;
          }
        } else if (rms > VAD_SPEECH_START_RMS_THRESHOLD) {
          speechCandidateChunksRef.current += 1;
          hasSpeech =
            speechCandidateChunksRef.current >=
            SPEECH_REENTRY_CONSECUTIVE_CHUNKS;
        } else {
          speechCandidateChunksRef.current = 0;
          hasSpeech = false;
        }
        speechActiveRef.current = hasSpeech;
        const chunkDuration = inputData.length / sampleRate;
        const { speechSeconds: prevSp, silenceSeconds: prevSl } = useAppStore.getState();
        if (rms > 0.005) {
          console.log(
            `[AudioPipeline] RMS=${rms.toFixed(4)} speech=${hasSpeech} sp=${prevSp.toFixed(1)}s sl=${prevSl.toFixed(1)}s thresholds=${VAD_SPEECH_START_RMS_THRESHOLD}/${VAD_SPEECH_END_RMS_THRESHOLD} speechCandidate=${speechCandidateChunksRef.current}/${SPEECH_REENTRY_CONSECUTIVE_CHUNKS} silenceResetCandidate=${silenceResetCandidateChunksRef.current}/${SILENCE_RESET_CONSECUTIVE_SPEECH_CHUNKS}`
          );
        }

        const currentStore = useAppStore.getState();
        let nextSpeechSeconds = currentStore.speechSeconds;
        let nextSilenceSeconds = currentStore.silenceSeconds;

        if (hasSpeech) {
          if (currentStore.silenceSeconds > 0) {
            silenceResetCandidateChunksRef.current += 1;

            if (
              silenceResetCandidateChunksRef.current >=
              SILENCE_RESET_CONSECUTIVE_SPEECH_CHUNKS
            ) {
              nextSpeechSeconds = currentStore.speechSeconds + chunkDuration;
              nextSilenceSeconds = 0;
            }
          } else {
            silenceResetCandidateChunksRef.current = 0;
            nextSpeechSeconds = currentStore.speechSeconds + chunkDuration;
            nextSilenceSeconds = 0;
          }
        } else if (currentStore.speechSeconds > 0) {
          silenceResetCandidateChunksRef.current = 0;
          nextSilenceSeconds = currentStore.silenceSeconds + chunkDuration;
        }

        useAppStore
          .getState()
          .updateAudioCounters(nextSpeechSeconds, nextSilenceSeconds);

        const { speechSeconds: sp, silenceSeconds: sl } = useAppStore.getState();
        const shouldTrigger =
          (sl >= SILENCE_SECONDS_TO_TRIGGER && sp >= MIN_SPEECH_SECONDS_TO_TRIGGER) ||
          sp >= MAX_SPEECH_SECONDS_TO_TRIGGER;
        if (shouldTrigger) {
          console.log(
            `[AudioPipeline] TRIGGER: speech=${sp.toFixed(1)}s, silence=${sl.toFixed(1)}s trigger=${MIN_SPEECH_SECONDS_TO_TRIGGER}/${SILENCE_SECONDS_TO_TRIGGER}/${MAX_SPEECH_SECONDS_TO_TRIGGER} silenceResetCandidate=${silenceResetCandidateChunksRef.current}/${SILENCE_RESET_CONSECUTIVE_SPEECH_CHUNKS}`
          );
          processTranscript().catch((error) => {
            console.error("[AudioPipeline] Transcript processing failed:", error);
          });
        }
      }
    );

    if (result.status === "error") {
      throw new Error(result.message);
    }
  }, [processTranscript]);

  const startListening = useCallback(async () => {
    console.log("[AudioPipeline] startListening requested. modelsLoaded:", modelsLoaded);
    if (!modelsLoaded || isListeningRef.current) {
      if (!modelsLoaded) {
        console.warn("[AudioPipeline] Models not loaded yet");
      }
      return;
    }

    try {
      if (!sttReady.current) {
        console.log("[AudioPipeline] Initializing STT model...");
        await stt.current.init();
        sttReady.current = true;
      }

      const permission = await AudioManager.requestRecordingPermissions();
      if (permission !== "Granted") {
        console.error("[AudioPipeline] Microphone permission not granted");
        return;
      }

      AudioManager.setAudioSessionOptions({
        iosCategory: "playAndRecord",
        iosOptions: ["defaultToSpeaker", "allowBluetoothHFP"],
        iosMode: "default",
      });

      const audioSessionReady = await AudioManager.setAudioSessionActivity(true);
      if (!audioSessionReady) {
        console.error("[AudioPipeline] Could not activate audio session");
        return;
      }

      if (!recorder.current) {
        recorder.current = new AudioRecorder();
      }

      ringBuffer.current = [];
      captureSampleRateRef.current = TARGET_SAMPLE_RATE;
      processingRef.current = false;
      speechActiveRef.current = false;
      speechCandidateChunksRef.current = 0;
      silenceResetCandidateChunksRef.current = 0;
      recorderPausedRef.current = false;
      useAppStore.getState().resetAudioCounters();

      setupAudioProcess();

      const result = recorder.current.start();
      if (result.status === "error") {
        throw new Error(result.message);
      }

      isListeningRef.current = true;
      setIsListening(true);
      useAppStore.getState().setPipelinePhase("listening");
    } catch (error) {
      console.error("[AudioPipeline] Failed to start audio pipeline:", error);
      stopCapture("idle");
    }
  }, [modelsLoaded, setupAudioProcess, stopCapture]);

  const stopListening = useCallback(() => {
    console.log("[AudioPipeline] stopListening called");
    stopCapture("idle");
  }, [stopCapture]);

  const onTranscriptReady = useCallback((cb: (transcript: string) => void) => {
    callbackRef.current = cb;
  }, []);

  useEffect(() => {
    const sttInstance = stt.current;
    return () => {
      console.log("[AudioPipeline] Hook unmounting, cleaning up...");
      stopListening();
      sttInstance.destroy().catch((error) => {
        console.warn("[AudioPipeline] Failed to destroy STT instance:", error);
      });
    };
  }, [stopListening]);

  return {
    isListening,
    speechSeconds,
    silenceSeconds,
    startListening,
    stopListening,
    onTranscriptReady,
  };
}
