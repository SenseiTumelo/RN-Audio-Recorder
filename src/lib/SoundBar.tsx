import { StyleSheet, View } from "react-native";
import { COLORS } from "./theme";

// Turns the phone's loudness reading (decibels, about -60 quiet to 0 loud)
// into a number from 0.08 to 1 that we can use as a bar height.
export const meterToLevel = (db?: number | null) => {
  if (db === undefined || db === null) return 0.08;
  const level = (db + 60) / 60;
  return Math.max(0.08, Math.min(1, level));
};

// Shrinks a long list of levels down to `count` bars by averaging groups.
export const compressLevels = (levels: number[], count: number) => {
  if (levels.length === 0) return Array(count).fill(0.08);

  return Array.from({ length: count }, (_, i) => {
    const start = Math.floor((i * levels.length) / count);
    const end = Math.max(start + 1, Math.floor(((i + 1) * levels.length) / count));
    const group = levels.slice(start, end);
    return group.reduce((sum, value) => sum + value, 0) / group.length;
  });
};

type Props = {
  levels: number[]; // one number (0 to 1) per bar
  progress?: number; // 0 to 1: how much of the bars are "played" (black)
  height?: number;
  activeColor?: string;
};

export default function SoundBars({
  levels,
  progress = 1,
  height = 48,
  activeColor = COLORS.primary,
}: Props) {
  return (
    <View style={[styles.row, { height }]}>
      {levels.map((level, i) => {
        const played = i / levels.length < progress;
        return (
          <View
            key={i}
            style={[
              styles.bar,
              {
                height: Math.max(4, level * height),
                backgroundColor: played ? activeColor : COLORS.faint,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  bar: { flex: 1, marginHorizontal: 1, borderRadius: 2 },
});