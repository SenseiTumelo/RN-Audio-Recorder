import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";

export type VoiceNote = {
  id: string;
  name: string;
  fileName: string;
  durationMs: number;
  createdAt: string;
  waveform?: number[]; // loudness of the recording, for the sound bars
};

const STORAGE_KEY = "voice-notes";

// CHANGED: a function instead of a variable. The folder is only built
// when this function is called, never when the file is first imported.
const getRecordingsDir = () => new Directory(Paths.document, "recordings");

export const getNoteUri = (note: VoiceNote) =>
  new File(getRecordingsDir(), note.fileName).uri;

export async function loadNotes(): Promise<VoiceNote[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  return json ? JSON.parse(json) : [];
}

async function saveNotes(notes: VoiceNote[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export async function addNote(
  tempUri: string,
  durationMs: number,
  waveform: number[] 
): Promise<VoiceNote> {
  const recordingsDir = getRecordingsDir(); // CHANGED: created here, when needed

  if (!recordingsDir.exists) {
    recordingsDir.create();
  }

  const id = Date.now().toString();
  const fileName = `${id}.m4a`;

  const tempFile = new File(tempUri);
  tempFile.move(new File(recordingsDir, fileName));

const note: VoiceNote = {
  id,
  name: `Voice note ${new Date().toLocaleString()}`,
  fileName,
  durationMs,
  createdAt: new Date().toISOString(),
  waveform, 
};

  const notes = await loadNotes();
  await saveNotes([note, ...notes]);

  return note;
}

// Changes the name of one note and returns the updated list
export async function renameNote(
  id: string,
  name: string
): Promise<VoiceNote[]> {
  const notes = await loadNotes();
  const updated = notes.map((note) =>
    note.id === id ? { ...note, name } : note
  );
  await saveNotes(updated);
  return updated;
}

// Deletes the audio file AND removes the note from the saved list
export async function deleteNote(note: VoiceNote): Promise<void> {
  const file = new File(getRecordingsDir(), note.fileName);
  if (file.exists) {
    file.delete();
  }

  const notes = await loadNotes();
  await saveNotes(notes.filter((n) => n.id !== note.id));
}