import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSignIn } from "@clerk/clerk-expo";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleSignIn = useCallback(async () => {
    if (!isLoaded) return;
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password: password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log("[Auth] Sign in successful");
        router.replace("/" as any);
      } else {
        console.log("[Auth] Sign in incomplete:", result.status);
        setError("Sign in could not be completed. Please try again.");
      }
    } catch (err: any) {
      console.error("[Auth] Sign in error:", err);
      const message = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || "Invalid email or password";
      setError(message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }, [isLoaded, email, password, signIn, setActive, router]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[Colors.dark.background, "#0F0F1A", Colors.dark.background]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.dark.text} />
          </TouchableOpacity>

          <View style={styles.heroSection}>
            <Text style={styles.logo}>T</Text>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to your Trendz account</Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Mail size={18} color={Colors.dark.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={Colors.dark.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                testID="email-input"
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={18} color={Colors.dark.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colors.dark.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                testID="password-input"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff size={18} color={Colors.dark.textMuted} />
                ) : (
                  <Eye size={18} color={Colors.dark.textMuted} />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleSignIn}
              style={[styles.signInButton, loading && styles.signInButtonDisabled]}
              activeOpacity={0.8}
              disabled={loading}
              testID="sign-in-button"
            >
              {loading ? (
                <ActivityIndicator color={Colors.dark.background} />
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.replace("/sign-up" as any)}>
              <Text style={styles.footerLink}> Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.surfaceElevated,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 24,
  },
  heroSection: {
    marginBottom: 32,
  },
  logo: {
    fontSize: 48,
    fontWeight: "900" as const,
    color: Colors.dark.accent,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.textMuted,
    marginTop: 6,
  },
  errorContainer: {
    backgroundColor: "rgba(206, 17, 38, 0.15)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(206, 17, 38, 0.3)",
  },
  errorText: {
    color: "#CE1126",
    fontSize: 14,
  },
  form: {
    gap: 14,
  },
  inputContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  input: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 16,
  },
  signInButton: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center" as const,
    marginTop: 8,
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    color: Colors.dark.background,
    fontSize: 16,
    fontWeight: "700" as const,
  },
  footer: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    marginTop: 32,
  },
  footerText: {
    color: Colors.dark.textMuted,
    fontSize: 15,
  },
  footerLink: {
    color: Colors.dark.accent,
    fontSize: 15,
    fontWeight: "600" as const,
  },
});
