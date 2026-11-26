import { Stack } from "expo-router";
import { COLORS } from "../lib/theme";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // our screens draw their own titles
        animation: "fade",
        contentStyle: { backgroundColor: COLORS.background },
      }}
    />
  );
}