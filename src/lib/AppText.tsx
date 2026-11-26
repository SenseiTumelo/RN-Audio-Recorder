import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  TextInputProps,
  TextProps,
} from "react-native";

// Which Inter file to use for each fontWeight we write in our styles
const FAMILY_BY_WEIGHT: Record<string, string> = {
  normal: "Inter_400Regular",
  "400": "Inter_400Regular",
  "500": "Inter_500Medium",
  "600": "Inter_600SemiBold",
  "700": "Inter_700Bold",
  bold: "Inter_700Bold",
  "800": "Inter_800ExtraBold",
  "900": "Inter_800ExtraBold",
};

// Looks at a style, finds its fontWeight, and returns the matching font name
const familyFor = (style: TextProps["style"]) => {
  const weight = String(StyleSheet.flatten(style)?.fontWeight ?? "400");
  return FAMILY_BY_WEIGHT[weight] ?? "Inter_400Regular";
};

// Works exactly like React Native's <Text>, but always uses Inter
export function Text({ style, ...props }: TextProps) {
  return (
    <RNText
      {...props}
      style={[style, { fontFamily: familyFor(style), fontWeight: "normal" }]}
    />
  );
}

// Works exactly like React Native's <TextInput>, but always uses Inter
export function TextInput({ style, ...props }: TextInputProps) {
  return (
    <RNTextInput
      {...props}
      style={[style, { fontFamily: familyFor(style), fontWeight: "normal" }]}
    />
  );
}