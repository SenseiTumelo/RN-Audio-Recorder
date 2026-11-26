import { useEffect } from "react";
import { Alert, Linking, StyleSheet, Text, View } from "react-native";
import { AudioModule } from "expo-audio";

export default function Index() {
  useEffect(() => {
    const askForMicrophone = async () => {
      // Shows the system popup (or returns the saved answer if already given)
      const status = await AudioModule.requestRecordingPermissionsAsync();

      if (!status.granted) {
        Alert.alert(
          "Microphone access needed",
          "Voice Journal needs the microphone to record. You can turn it on in Settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
      }
    };

    askForMicrophone();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Journal</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "bold" },
});