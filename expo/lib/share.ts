import { Share, Platform, Linking, Alert, ActionSheetIOS } from "react-native";
import * as Haptics from "expo-haptics";

interface ShareOptions {
  title: string;
  message: string;
  url?: string;
}

export async function shareArticle({ title, message, url }: ShareOptions) {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

  const fullMessage = url ? `${message}\n\n${url}` : message;
  const whatsappMessage = encodeURIComponent(fullMessage);
  const whatsappUrl = `whatsapp://send?text=${whatsappMessage}`;

  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ["Cancel", "Share via WhatsApp", "More options..."],
        cancelButtonIndex: 0,
        title: "Share Article",
      },
      async (buttonIndex) => {
        if (buttonIndex === 1) {
          const canOpen = await Linking.canOpenURL(whatsappUrl);
          if (canOpen) {
            Linking.openURL(whatsappUrl);
          } else {
            Alert.alert("WhatsApp not installed", "Please install WhatsApp to share via WhatsApp.");
          }
        } else if (buttonIndex === 2) {
          Share.share({ title, message: fullMessage });
        }
      }
    );
  } else if (Platform.OS === "android") {
    Alert.alert("Share Article", "Choose how to share", [
      { text: "Cancel", style: "cancel" },
      {
        text: "WhatsApp",
        onPress: async () => {
          const canOpen = await Linking.canOpenURL(whatsappUrl);
          if (canOpen) {
            Linking.openURL(whatsappUrl);
          } else {
            Alert.alert("WhatsApp not installed", "Please install WhatsApp to share via WhatsApp.");
          }
        },
      },
      {
        text: "More options",
        onPress: () => {
          Share.share({ title, message: fullMessage });
        },
      },
    ]);
  } else {
    try {
      await Share.share({ title, message: fullMessage });
    } catch (e) {
      console.log("[Share] Web share error:", e);
    }
  }
}
