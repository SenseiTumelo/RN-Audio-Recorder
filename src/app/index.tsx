import { useEffect } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";

// Turns milliseconds into "mm:ss", e.g. 65000 -> "01:05"
const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

export default function Index() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  useEffect(() => {
    const setup = async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();

      if (!status.granted) {
        Alert.alert(
          "Microphone access needed",
          "Voice Journal needs the microphone to record. You can turn it on in Settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      // Allow recording (and playback on iPhones even in silent mode)
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    };

    setup();
  }, []);

  const startRecording = async () => {
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stopRecording = async () => {
    await recorder.stop();
    console.log("Recorded file:", recorder.uri);
  };

  const handlePress = () => {
    if (recorderState.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Journal</Text>

      <Text style={styles.timer}>{formatDuration(recorderState.durationMillis)}</Text>

      <Pressable
        onPress={handlePress}
        style={[styles.button, recorderState.isRecording && styles.buttonRecording]}
      >
        <Text style={styles.buttonText}>
          {recorderState.isRecording ? "Stop" : "Record"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 24 },
  title: { fontSize: 24, fontWeight: "bold" },
  timer: { fontSize: 48, fontVariant: ["tabular-nums"] },
  button: {
    backgroundColor: "#4f46e5",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 999,
  },
  buttonRecording: { backgroundColor: "#dc2626" },
  buttonText: { color: "white", fontSize: 18, fontWeight: "600" },
});