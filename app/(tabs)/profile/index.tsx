import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  LogOut,
  User,
  Settings,
  Bell,
  Shield,
  ChevronRight,
  Newspaper,
  Zap,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAuthContext } from "@/providers/AuthProvider";
import { useBookmarks } from "@/providers/BookmarkProvider";
import Colors from "@/constants/colors";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn, isLoaded, userName, userEmail, userAvatar, signOut } = useAuthContext();
  const { bookmarkedIds } = useBookmarks();

  const handleSignOut = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
  }, [signOut]);

  if (!isLoaded) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.dark.accent} />
      </View>
    );
  }

  if (!isSignedIn) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.authPrompt}>
          <View style={styles.authIconContainer}>
            <User size={48} color={Colors.dark.textMuted} />
          </View>
          <Text style={styles.authTitle}>Sign in to Trendz</Text>
          <Text style={styles.authDescription}>
            Create an account to save bookmarks, personalize your feed, and more
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/sign-in" as any)}
            style={styles.signInBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.signInBtnText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/sign-up" as any)}
            style={styles.signUpBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.signUpBtnText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const menuItems = [
    { icon: Bell, label: "Notifications", subtitle: "Manage your alerts" },
    { icon: Newspaper, label: "Reading History", subtitle: "Articles you've read" },
    { icon: Settings, label: "Preferences", subtitle: "Customize your feed" },
    { icon: Shield, label: "Privacy", subtitle: "Data and security" },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <View style={styles.profileCard}>
          {userAvatar ? (
            <Image source={{ uri: userAvatar }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <User size={32} color={Colors.dark.textMuted} />
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userName || "Trendz User"}</Text>
            <Text style={styles.profileEmail}>{userEmail || ""}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Zap size={20} color={Colors.dark.accent} />
            <Text style={styles.statNumber}>{bookmarkedIds.length}</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
          <View style={styles.statCard}>
            <Newspaper size={20} color={Colors.dark.accentGreen} />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Read</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <TouchableOpacity key={item.label} style={styles.menuItem} activeOpacity={0.7}>
              <View style={styles.menuIconContainer}>
                <item.icon size={20} color={Colors.dark.accent} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <ChevronRight size={18} color={Colors.dark.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleSignOut}
          style={styles.signOutBtn}
          activeOpacity={0.7}
        >
          <LogOut size={20} color="#CE1126" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  centered: {
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800" as const,
    color: Colors.dark.text,
    letterSpacing: -0.5,
  },
  profileCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 24,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.dark.surfaceElevated,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.dark.text,
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row" as const,
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: "center" as const,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: Colors.dark.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.dark.textMuted,
  },
  menuSection: {
    paddingHorizontal: 20,
    gap: 4,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 14,
    gap: 14,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.dark.surfaceElevated,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.dark.text,
  },
  menuSubtitle: {
    fontSize: 13,
    color: Colors.dark.textMuted,
    marginTop: 1,
  },
  signOutBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "rgba(206, 17, 38, 0.1)",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(206, 17, 38, 0.2)",
  },
  signOutText: {
    color: "#CE1126",
    fontSize: 16,
    fontWeight: "600" as const,
  },
  authPrompt: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  authIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.dark.surfaceElevated,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 20,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.dark.text,
    marginBottom: 8,
  },
  authDescription: {
    fontSize: 15,
    color: Colors.dark.textMuted,
    textAlign: "center" as const,
    lineHeight: 22,
    marginBottom: 28,
  },
  signInBtn: {
    width: "100%",
    backgroundColor: Colors.dark.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center" as const,
    marginBottom: 12,
  },
  signInBtnText: {
    color: Colors.dark.background,
    fontSize: 16,
    fontWeight: "700" as const,
  },
  signUpBtn: {
    width: "100%",
    backgroundColor: Colors.dark.surfaceElevated,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  signUpBtnText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "600" as const,
  },
});
