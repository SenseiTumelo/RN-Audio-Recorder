import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "has-seen-welcome";

// true if the user has already finished (or skipped) the welcome slides
export async function hasSeenWelcome(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY)) === "true";
}

// call this when the user finishes or skips the slides
export async function markWelcomeSeen(): Promise<void> {
  await AsyncStorage.setItem(KEY, "true");
}