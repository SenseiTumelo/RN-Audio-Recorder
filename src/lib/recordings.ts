import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";

// The shape of one voice note. TypeScript uses this to catch typos for us.
export type VoiceNote = {
  id: string;
  name: string;
  fileName: string;
  durationMs: number;
  createdAt: string; // date stored as text, e.g. "2026-11-26T14:32:10.000Z"
};

const STORAGE_KEY = "voice-notes";

// A "recordings" folder inside the app's permanent document folder
const recordingsDir = new Directory(Paths.document, "recordings");

// Rebuilds the full file location from the saved file name
export const getNoteUri = (note: VoiceNote) =>
  new File(recordingsDir, note.fileName).uri;

// Reads the saved list. If nothing is saved yet, returns an empty list.
export async function loadNotes(): Promise<VoiceNote[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  return json ? JSON.parse(json) : [];
}

// Writes the whole list back to storage
async function saveNotes(notes: VoiceNote[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

// Moves a fresh recording to permanent storage and records its details
export async function addNote(
  tempUri: string,
  durationMs: number
): Promise<VoiceNote> {
  // Create the folder the first time
  if (!recordingsDir.exists) {
    recordingsDir.create();
  }

  const id = Date.now().toString();
  const fileName = `${id}.m4a`;

  // Move the file from the temporary cache to our permanent folder
  const tempFile = new File(tempUri);
  tempFile.move(new File(recordingsDir, fileName));

  const note: VoiceNote = {
    id,
    name: `Voice note ${new Date().toLocaleString()}`,
    fileName,
    durationMs,
    createdAt: new Date().toISOString(),
  };

  // Put the newest note first, then save the list
  const notes = await loadNotes();
  await saveNotes([note, ...notes]);

  return note;
}