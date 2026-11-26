import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import {
  addNote,
  deleteNote,
  getNoteUri,
  loadNotes,
  renameNote,
  VoiceNote,
} from "../lib/recordings";
import { formatDate, formatDuration } from "../lib/format";
import { COLORS } from "../lib/theme";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

// Change this to your own email address
const SUPPORT_EMAIL = "support@example.com";

export default function Home() {
  const router = useRouter();

  // Recording
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  // Playback: ONE player shared by every note in the list
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [query, setQuery] = useState("");

  // Rename popup: which note is being renamed, and what is typed
  const [renameTarget, setRenameTarget] = useState<VoiceNote | null>(null);
  const [renameText, setRenameText] = useState("");

  const activeNote = notes.find((n) => n.id === activeId);

  // The notes whose name contains the search text
  const filteredNotes = notes.filter((note) =>
    note.name.toLowerCase().includes(query.trim().toLowerCase())
  );

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
    player.replace(getNoteUri(note));
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

  // ---------- Rename ----------
  const openRename = (note: VoiceNote) => {
    setRenameTarget(note);
    setRenameText(note.name);
  };

  const saveRename = async () => {
    const name = renameText.trim();
    if (!renameTarget || !name) return; // don't allow an empty name

    const updated = await renameNote(renameTarget.id, name);
    setNotes(updated);
    setRenameTarget(null); // closes the popup
  };

  // ---------- Delete ----------
  const confirmDelete = (note: VoiceNote) => {
    Alert.alert("Delete voice note", `Delete "${note.name}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          // If this note is loaded in the player, stop it first
          if (note.id === activeId) {
            player.pause();
            setActiveId(null);
          }
          await deleteNote(note);
          setNotes((current) => current.filter((n) => n.id !== note.id));
        },
      },
    ]);
  };

  // ---------- Feedback and support ----------
  const sendEmail = async (subject: string) => {
    try {
      await Linking.openURL(
        `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`
      );
    } catch {
      // Happens when the phone has no email app set up
      Alert.alert("No email app found", `You can reach us at ${SUPPORT_EMAIL}.`);
    }
  };

  const openHelp = () => {
    Alert.alert("Feedback & support", "Tell us what you think, or ask for help.", [
      { text: "Send feedback", onPress: () => sendEmail("Voice Journal feedback") },
      { text: "Get support", onPress: () => sendEmail("Voice Journal support") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

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
          size={44}
          color={COLORS.primary}
        />

        <View style={styles.rowText}>
          <Text style={styles.noteName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.noteDate} numberOfLines={1}>
            {formatDate(item.createdAt)} · {formatDuration(item.durationMs)}
          </Text>
        </View>

        {/* Rename and delete buttons */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => openRename(item)}
            hitSlop={8}
            style={styles.actionButton}
          >
            <Ionicons name="pencil" size={20} color={COLORS.text} />
          </Pressable>
          <Pressable
            onPress={() => confirmDelete(item)}
            hitSlop={8}
            style={styles.actionButton}
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header: title, note count, and the two help buttons */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Voice Journal</Text>
          <Text style={styles.subtitle}>
            {notes.length} {notes.length === 1 ? "voice note" : "voice notes"}
          </Text>
        </View>

        <View style={styles.headerButtons}>
          <Pressable
            onPress={() => router.push("/welcome")}
            hitSlop={8}
            style={styles.helpButton}
          >
            <Ionicons
              name="information-circle-outline"
              size={28}
              color={COLORS.primary}
            />
          </Pressable>
          <Pressable onPress={openHelp} hitSlop={8} style={styles.helpButton}>
            <Ionicons name="help-circle-outline" size={28} color={COLORS.primary} />
          </Pressable>
        </View>
      </View>

      {/* Search box */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={COLORS.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search voice notes"
          style={styles.searchInput}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={COLORS.muted} />
          </Pressable>
        )}
      </View>

      {/* The list of notes */}
      <FlatList
        data={filteredNotes}
        keyExtractor={(item) => item.id}
        renderItem={renderNote}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons
              name={query.trim() ? "search-outline" : "mic-outline"}
              size={56}
              color={COLORS.faint}
            />
            <Text style={styles.emptyTitle}>
              {query.trim() ? "No results" : "No voice notes yet"}
            </Text>
            <Text style={styles.emptyText}>
              {query.trim()
                ? "No voice notes match your search."
                : "Tap the microphone below to record your first note."}
            </Text>
          </View>
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
              <Ionicons name="play-back" size={28} color={COLORS.text} />
            </Pressable>
            <Pressable onPress={togglePlay}>
              <Ionicons
                name={status.playing ? "pause-circle" : "play-circle"}
                size={56}
                color={COLORS.primary}
              />
            </Pressable>
            <Pressable onPress={() => skip(10)}>
              <Ionicons name="play-forward" size={28} color={COLORS.text} />
            </Pressable>
            <Pressable onPress={changeSpeed} style={styles.speedButton}>
              <Text style={styles.speedText}>{speed}x</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Recorder */}
      <View style={styles.recorder}>
        <Text style={[styles.timer, recorderState.isRecording && styles.timerRecording]}>
          {formatDuration(recorderState.durationMillis)}
        </Text>
        <Text style={styles.recorderLabel}>
          {recorderState.isRecording ? "Recording… tap to stop" : "Tap to record"}
        </Text>
        <Pressable
          onPress={handleRecordPress}
          style={[
            styles.recordButton,
            recorderState.isRecording && styles.recordButtonActive,
          ]}
        >
          <Ionicons
            name={recorderState.isRecording ? "stop" : "mic"}
            size={32}
            color="white"
          />
        </Pressable>
      </View>

      {/* Rename popup: visible only when renameTarget is set */}
      <Modal
        visible={renameTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename voice note</Text>
            <TextInput
              value={renameText}
              onChangeText={setRenameText}
              style={styles.input}
              autoFocus
              selectTextOnFocus
              placeholder="Name"
              maxLength={60}
              onSubmitEditing={saveRename}
            />
            <View style={styles.modalButtons}>
              <Pressable onPress={() => setRenameTarget(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveRename}>
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: "800", color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.muted, marginTop: 2 },
  headerButtons: { flexDirection: "row", gap: 8 },
  helpButton: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 999,
    padding: 6,
  },

  // Search
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16 },

  // List
  list: { paddingHorizontal: 16, paddingBottom: 12, gap: 10, flexGrow: 1 },

  emptyBox: { alignItems: "center", marginTop: 60, paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  emptyText: { textAlign: "center", color: COLORS.muted, fontSize: 15 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    elevation: 2, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  rowActive: { borderColor: COLORS.primary },
  rowText: { flex: 1, minWidth: 0 },
  noteName: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  noteDate: { fontSize: 13, color: COLORS.muted, marginTop: 2 },

  actions: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 },
  actionButton: {
    padding: 8,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 999,
  },

  // Player bar
  player: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  playerName: { fontWeight: "600", fontSize: 15, color: COLORS.text },
  progressTrack: { height: 6, backgroundColor: COLORS.border, borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: COLORS.primary, borderRadius: 3 },
  timeRow: { flexDirection: "row", justifyContent: "space-between" },
  time: { fontSize: 12, color: COLORS.muted, fontVariant: ["tabular-nums"] },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  speedButton: {
    backgroundColor: COLORS.primarySoft,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  speedText: { color: COLORS.primary, fontWeight: "700" },

  // Recorder
  recorder: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 16,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  timer: { fontSize: 32, fontVariant: ["tabular-nums"], color: COLORS.text },
  timerRecording: { color: COLORS.danger },
  recorderLabel: { fontSize: 13, color: COLORS.muted, marginBottom: 8 },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  recordButtonActive: { backgroundColor: COLORS.danger, shadowColor: COLORS.danger },

  // Rename popup
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 24 },
  cancelText: { fontSize: 16, color: COLORS.muted },
  saveText: { fontSize: 16, color: COLORS.primary, fontWeight: "700" },
});