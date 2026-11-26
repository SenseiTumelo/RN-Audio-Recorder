import { useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Image,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "../lib/theme";
import { markWelcomeSeen } from "../lib/onboarding";

type Slide = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  showLogo?: boolean;
};

const SLIDES: Slide[] = [
  {
    id: "welcome",
    icon: "mic",
    title: "Welcome to Voice Journal",
    text: "Your personal space to capture thoughts, ideas and memories with your voice.",
    showLogo: true,
  },
  {
    id: "record",
    icon: "radio-button-on",
    title: "Record in one tap",
    text: "Tap the round microphone button to start recording. Tap it again to stop. Your note is saved automatically.",
  },
  {
    id: "play",
    icon: "play",
    title: "Play it back your way",
    text: "Tap any note to play it. Pause, skip 10 seconds back or forward, and change the speed.",
  },
  {
    id: "organise",
    icon: "search",
    title: "Keep it organised",
    text: "Use the pencil to rename a note, the bin to delete it, and the search box to find a note by name. Everything works offline.",
  },
];

export default function Welcome() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  // Save that the welcome was seen, then leave the screen
  const finish = async () => {
    await markWelcomeSeen();
    if (router.canGoBack()) {
      router.back(); // opened from the "How it works" button
    } else {
      router.replace("/home"); // first launch
    }
  };

  const next = () => {
    if (isLast) {
      finish();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  // Runs when a swipe finishes: work out which slide we are on
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Skip button (hidden on the last slide, but keeps its space) */}
      <View style={styles.topBar}>
        {!isLast && (
          <Pressable onPress={finish} hitSlop={8}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
renderItem={({ item }) => (
  <View style={[styles.slide, { width }]}>
    {item.showLogo ? (
      <Image
        source={require("../../assets/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
    ) : (
      <View style={styles.iconCircle}>
        <Ionicons name={item.icon} size={64} color="white" />
      </View>
    )}
    <Text style={styles.title}>{item.title}</Text>
    <Text style={styles.text}>{item.text}</Text>
  </View>
)}
      />

      {/* Dots show which slide you are on */}
      <View style={styles.dots}>
        {SLIDES.map((slide, i) => (
          <View key={slide.id} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <Pressable onPress={next} style={styles.button}>
        <Text style={styles.buttonText}>{isLast ? "Get started" : "Next"}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    height: 44,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  skip: { fontSize: 16, color: COLORS.muted, fontWeight: "600" },

  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 16,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  logo: { width: 160, height: 160, marginBottom: 24 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.muted,
    textAlign: "center",
  },

  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.faint },
  dotActive: { width: 24, backgroundColor: COLORS.primary },

  button: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 24,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
  },
  buttonText: { color: "white", fontSize: 18, fontWeight: "700" },
});