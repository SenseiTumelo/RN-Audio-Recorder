import { ReactNode, useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { COLORS } from "./theme";

export type Motion = "float" | "pulse" | "ripple" | "wiggle";

// How long (in milliseconds) one swing "up" or "down" takes, for each motion
const SWING_MS: Record<Motion, number> = {
  float: 1400,
  pulse: 700,
  ripple: 900,
  wiggle: 450,
};

type Props = {
  motion: Motion;
  active: boolean; // true only while this slide is on screen
  size: number; // size of the icon, used to size the ripple rings
  children: ReactNode; // the icon (or logo) to animate
};

export default function MotionIcon({ motion, active, size, children }: Props) {
  // Animated.Value is a number that React Native can change smoothly over time
  const enter = useRef(new Animated.Value(0)).current; // the pop-in
  const swing = useRef(new Animated.Value(0)).current; // goes 0 -> 1 -> 0 -> 1 ...
  const ring1 = useRef(new Animated.Value(0)).current; // first ripple ring
  const ring2 = useRef(new Animated.Value(0)).current; // second ripple ring

  useEffect(() => {
    // Slide is off screen: reset everything and do nothing
    if (!active) {
      enter.setValue(0);
      swing.setValue(0);
      ring1.setValue(0);
      ring2.setValue(0);
      return;
    }

    // 1) Pop-in with a small bounce
    enter.setValue(0);
    Animated.spring(enter, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();

    // 2) Swing back and forth forever (smooth, slow at the ends)
    const ease = Easing.inOut(Easing.sin);
    const swingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(swing, {
          toValue: 1,
          duration: SWING_MS[motion],
          easing: ease,
          useNativeDriver: true,
        }),
        Animated.timing(swing, {
          toValue: 0,
          duration: SWING_MS[motion],
          easing: ease,
          useNativeDriver: true,
        }),
      ])
    );
    swingLoop.start();

    // 3) Ripple rings: only for the "ripple" motion. The second starts 1s later.
    const ringLoop = (value: Animated.Value) =>
      Animated.loop(
        Animated.timing(value, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      );
    const rings =
      motion === "ripple"
        ? [ringLoop(ring1), Animated.sequence([Animated.delay(1000), ringLoop(ring2)])]
        : [];
    rings.forEach((ring) => ring.start());

    // Cleanup: stop the animations when the slide leaves or the screen closes
    return () => {
      swingLoop.stop();
      rings.forEach((ring) => ring.stop());
    };
  }, [active, motion]);

  // Turn the 0-to-1 numbers into real movement
  const popScale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  const swingScale = swing.interpolate({
    inputRange: [0, 1],
    outputRange: [1, motion === "pulse" ? 1.12 : motion === "ripple" ? 1.05 : 1],
  });
  const scale = Animated.multiply(popScale, swingScale);

  const translateY = swing.interpolate({
    inputRange: [0, 1],
    outputRange: [0, motion === "float" ? -14 : 0],
  });

  const rotate = swing.interpolate({
    inputRange: [0, 1],
    outputRange: motion === "wiggle" ? ["-10deg", "10deg"] : ["0deg", "0deg"],
  });

  // Each ring grows and fades out as its value goes from 0 to 1
  const ringStyle = (value: Animated.Value) => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0] }),
    transform: [
      { scale: value.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) },
    ],
  });

  const box = size * 1.7; // extra room around the icon so the rings are not cut off

  return (
    <View style={[styles.box, { width: box, height: box }]}>
      {motion === "ripple" && active && (
        <>
          <Animated.View style={[styles.ring, ringStyle(ring1)]} />
          <Animated.View style={[styles.ring, ringStyle(ring2)]} />
        </>
      )}

      <Animated.View style={{ transform: [{ translateY }, { rotate }, { scale }] }}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", backgroundColor: COLORS.primary },
});