import { useEffect } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { hasSeenWelcome } from "../lib/onboarding";
import { COLORS } from "../lib/theme";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Check the saved value, then go to the right screen
    hasSeenWelcome().then((seen) => {
      router.replace(seen ? "/home" : "/welcome");
    });
  }, []);

  // A blank white screen for the split second while we check
  return <View style={{ flex: 1, backgroundColor: COLORS.background }} />;
}