import { useEffect, useState } from "react"; // NEW: useState
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { addNote, loadNotes, VoiceNote } from "../lib/recordings"; // NEW

const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

export default function Index() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [notes, setNotes] = useState<VoiceNote[]>([]); // NEW

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

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    };

    setup();
    loadNotes().then(setNotes); // NEW: load saved notes when the screen opens
  }, []);

  const startRecording = async () => {
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stopRecording = async () => {
    const duration = recorderState.durationMillis; // NEW: grab it BEFORE stopping
    await recorder.stop();

    // NEW: save the file permanently and update the list on screen
    if (recorder.uri) {
      const note = await addNote(recorder.uri, duration);
      setNotes((current) => [note, ...current]);
    }
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

      {/* NEW: a temporary counter so we can test saving */}
      <Text>{notes.length} saved notes</Text>
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