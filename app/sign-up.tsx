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
  ScrollView,
} from "react-native";
import { useSignUp } from "@clerk/clerk-expo";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [firstName, setFirstName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [pendingVerification, setPendingVerification] = useState<boolean>(false);
  const [verificationCode, setVerificationCode] = useState<string>("");

  const handleSignUp = useCallback(async () => {
    if (!isLoaded) return;
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await signUp.create({
        firstName: firstName.trim() || undefined,
        emailAddress: email.trim(),
        password: password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
      console.log("[Auth] Verification email sent");
    } catch (err: any) {
      console.error("[Auth] Sign up error:", err);
      const message = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || "Could not create account";
      setError(message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }, [isLoaded, email, password, firstName, signUp]);

  const handleVerify = useCallback(async () => {
    if (!isLoaded) return;
    if (!verificationCode.trim()) {
      setError("Please enter the verification code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log("[Auth] Account created and verified");
        router.replace("/" as any);
      } else {
        console.log("[Auth] Verification incomplete:", result.status);
        setError("Verification could not be completed");
      }
    } catch (err: any) {
      console.error("[Auth] Verification error:", err);
      const message = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || "Invalid verification code";
      setError(message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }, [isLoaded, verificationCode, signUp, setActive, router]);

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
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.dark.text} />
          </TouchableOpacity>

          <View style={styles.heroSection}>
            <Text style={styles.logo}>T</Text>
            <Text style={styles.title}>
              {pendingVerification ? "Verify email" : "Join Trendz"}
            </Text>
            <Text style={styles.subtitle}>
              {pendingVerification
                ? "Enter the code sent to your email"
                : "Stay updated with Ghana's trending news"}
            </Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {pendingVerification ? (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="Verification code"
                  placeholderTextColor={Colors.dark.textMuted}
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  testID="code-input"
                />
              </View>

              <TouchableOpacity
                onPress={handleVerify}
                style={[styles.signUpButton, loading && styles.signUpButtonDisabled]}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.dark.background} />
                ) : (
                  <Text style={styles.signUpButtonText}>Verify & Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <User size={18} color={Colors.dark.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="First name (optional)"
                  placeholderTextColor={Colors.dark.textMuted}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                />
              </View>

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
                onPress={handleSignUp}
                style={[styles.signUpButton, loading && styles.signUpButtonDisabled]}
                activeOpacity={0.8}
                disabled={loading}
                testID="sign-up-button"
              >
                {loading ? (
                  <ActivityIndicator color={Colors.dark.background} />
                ) : (
                  <Text style={styles.signUpButtonText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.replace("/sign-in" as any)}>
              <Text style={styles.footerLink}> Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  codeInput: {
    textAlign: "center" as const,
    fontSize: 24,
    fontWeight: "700" as const,
    letterSpacing: 8,
  },
  signUpButton: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center" as const,
    marginTop: 8,
  },
  signUpButtonDisabled: {
    opacity: 0.6,
  },
  signUpButtonText: {
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
