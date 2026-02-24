import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!", headerStyle: { backgroundColor: Colors.dark.background }, headerTintColor: Colors.dark.text }} />
      <View style={styles.container}>
        <Text style={styles.title}>Page not found</Text>
        <Text style={styles.description}>This screen doesn't exist in Trendz.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Back to Feed</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 20,
    backgroundColor: Colors.dark.background,
  },
  title: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: Colors.dark.textMuted,
    marginBottom: 20,
  },
  link: {
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.dark.background,
  },
});
