import { useEffect } from "react";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { hasSeenWelcome } from "../lib/onboarding";
import { COLORS } from "../lib/theme";

// How long the logo stays on screen, in milliseconds
const MIN_LOADING_TIME = 1200;

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const start = async () => {
      // Run both at the same time and wait until BOTH are finished:
      // 1) check if the welcome was seen, 2) a short timer so the logo is visible
      const [seen] = await Promise.all([
        hasSeenWelcome(),
        new Promise((resolve) => setTimeout(resolve, MIN_LOADING_TIME)),
      ]);

      router.replace(seen ? "/home" : "/welcome");
    };

    start();
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator color={COLORS.primary} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  logo: { width: 200, height: 200 },
  spinner: { marginTop: 24 },
});