import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Colors from "@/constants/colors";

export default function ModalScreen() {
  return (
    <Pressable style={styles.overlay} onPress={() => router.back()}>
      <View style={styles.modalContent}>
        <Text style={styles.title}>Trendz</Text>
        <Text style={styles.description}>
          Your source for Ghana's trending news across politics, entertainment,
          sports, business, and tech.
        </Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  modalContent: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    padding: 24,
    margin: 20,
    alignItems: "center" as const,
    minWidth: 300,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  title: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: Colors.dark.accent,
    marginBottom: 12,
  },
  description: {
    textAlign: "center" as const,
    marginBottom: 24,
    color: Colors.dark.textSecondary,
    lineHeight: 22,
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 100,
  },
  closeButtonText: {
    color: Colors.dark.background,
    fontWeight: "700" as const,
    textAlign: "center" as const,
    fontSize: 14,
  },
});
