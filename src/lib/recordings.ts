import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";

export type VoiceNote = {
  id: string;
  name: string;
  fileName: string;
  durationMs: number;
  createdAt: string;
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
  durationMs: number
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
  };

  const notes = await loadNotes();
  await saveNotes([note, ...notes]);

  return note;
}