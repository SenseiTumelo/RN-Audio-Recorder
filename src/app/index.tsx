import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { addNote, getNoteUri, loadNotes, VoiceNote } from "../lib/recordings";
import { formatDate, formatDuration } from "../lib/format";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export default function Index() {
  // Recording
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  // Playback: ONE player shared by every note in the list
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);

  const activeNote = notes.find((n) => n.id === activeId);

  useEffect(() => {
    const setup = async () => {
      const permission = await AudioModule.requestRecordingPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Microphone access needed",
          "Voice Journal needs the microphone to record. You can turn it on in Settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
      }
    };

    setup();
    loadNotes().then(setNotes);
  }, []);

  // ---------- Recording ----------
  const startRecording = async () => {
    player.pause(); // never play and record at the same time
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stopRecording = async () => {
    const duration = recorderState.durationMillis;
    await recorder.stop();
    // Switch back to playback mode so sound comes out of the speaker
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });

    if (recorder.uri) {
      const note = await addNote(recorder.uri, duration);
      setNotes((current) => [note, ...current]);
    }
  };

  const handleRecordPress = () => {
    if (recorderState.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // ---------- Playback ----------
  const togglePlay = async () => {
    if (status.playing) {
      player.pause();
      return;
    }
    // If the note already reached the end, start again from 0
    if (status.duration > 0 && status.currentTime >= status.duration - 0.1) {
      await player.seekTo(0);
    }
    player.play();
  };

  const selectNote = (note: VoiceNote) => {
    if (note.id === activeId) {
      togglePlay(); // tapping the same note pauses / resumes
      return;
    }
    setActiveId(note.id);
    player.replace(getNoteUri(note)); // load a different file into the player
    player.setPlaybackRate(speed);
    player.play();
  };

  const skip = (seconds: number) => {
    const target = status.currentTime + seconds;
    player.seekTo(Math.max(0, Math.min(status.duration, target)));
  };

  const changeSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    player.setPlaybackRate(next);
  };

  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;

  // ---------- Screen ----------
  const renderNote = ({ item }: { item: VoiceNote }) => {
    const isActive = item.id === activeId;
    const isPlaying = isActive && status.playing;

    return (
      <Pressable
        onPress={() => selectNote(item)}
        style={[styles.row, isActive && styles.rowActive]}
      >
        <Ionicons
          name={isPlaying ? "pause-circle" : "play-circle"}
          size={40}
          color="#4f46e5"
        />
        <View style={styles.rowText}>
          <Text style={styles.noteName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.noteDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <Text style={styles.noteDuration}>{formatDuration(item.durationMs)}</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Voice Journal</Text>

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        renderItem={renderNote}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No voice notes yet. Tap Record to start.</Text>
        }
      />

      {/* Player bar: only shows once a note has been selected */}
      {activeNote && (
        <View style={styles.player}>
          <Text style={styles.playerName} numberOfLines={1}>
            {activeNote.name}
          </Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>

          <View style={styles.timeRow}>
            <Text style={styles.time}>{formatDuration(status.currentTime * 1000)}</Text>
            <Text style={styles.time}>{formatDuration(status.duration * 1000)}</Text>
          </View>

          <View style={styles.controls}>
            <Pressable onPress={() => skip(-10)}>
              <Ionicons name="play-back" size={28} color="#111827" />
            </Pressable>
            <Pressable onPress={togglePlay}>
              <Ionicons
                name={status.playing ? "pause-circle" : "play-circle"}
                size={56}
                color="#4f46e5"
              />
            </Pressable>
            <Pressable onPress={() => skip(10)}>
              <Ionicons name="play-forward" size={28} color="#111827" />
            </Pressable>
            <Pressable onPress={changeSpeed} style={styles.speedButton}>
              <Text style={styles.speedText}>{speed}x</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Recorder */}
      <View style={styles.recorder}>
        <Text style={styles.timer}>{formatDuration(recorderState.durationMillis)}</Text>
        <Pressable
          onPress={handleRecordPress}
          style={[styles.button, recorderState.isRecording && styles.buttonRecording]}
        >
          <Text style={styles.buttonText}>
            {recorderState.isRecording ? "Stop" : "Record"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  title: { fontSize: 28, fontWeight: "bold", padding: 20 },
  list: { paddingHorizontal: 16, gap: 8, flexGrow: 1 },
  empty: { textAlign: "center", color: "#6b7280", marginTop: 40 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "white",
    padding: 12,
    borderRadius: 12,
  },
  rowActive: { borderWidth: 2, borderColor: "#4f46e5" },
  rowText: { flex: 1 },
  noteName: { fontSize: 16, fontWeight: "600" },
  noteDate: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  noteDuration: { fontSize: 14, color: "#374151", fontVariant: ["tabular-nums"] },

  player: {
    backgroundColor: "white",
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#e5e7eb",
    gap: 8,
  },
  playerName: { fontWeight: "600", fontSize: 15 },
  progressTrack: { height: 6, backgroundColor: "#e5e7eb", borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: "#4f46e5", borderRadius: 3 },
  timeRow: { flexDirection: "row", justifyContent: "space-between" },
  time: { fontSize: 12, color: "#6b7280", fontVariant: ["tabular-nums"] },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  speedButton: {
    backgroundColor: "#eef2ff",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  speedText: { color: "#4f46e5", fontWeight: "700" },

  recorder: {
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderColor: "#e5e7eb",
  },
  timer: { fontSize: 36, fontVariant: ["tabular-nums"] },
  button: {
    backgroundColor: "#4f46e5",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 999,
  },
  buttonRecording: { backgroundColor: "#dc2626" },
  buttonText: { color: "white", fontSize: 18, fontWeight: "600" },
});