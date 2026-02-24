import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { TokenCache } from "@clerk/clerk-expo";

const createTokenCache = (): TokenCache => {
  return {
    getToken: async (key: string) => {
      try {
        if (Platform.OS === "web") {
          return localStorage.getItem(key);
        }
        const item = await SecureStore.getItemAsync(key);
        console.log("[Clerk] Token retrieved for key:", key);
        return item;
      } catch (error) {
        console.error("[Clerk] Error getting token:", error);
        return null;
      }
    },
    saveToken: async (key: string, token: string) => {
      try {
        if (Platform.OS === "web") {
          localStorage.setItem(key, token);
          return;
        }
        await SecureStore.setItemAsync(key, token);
        console.log("[Clerk] Token saved for key:", key);
      } catch (error) {
        console.error("[Clerk] Error saving token:", error);
      }
    },
    clearToken: async (key: string) => {
      try {
        if (Platform.OS === "web") {
          localStorage.removeItem(key);
          return;
        }
        await SecureStore.deleteItemAsync(key);
        console.log("[Clerk] Token cleared for key:", key);
      } catch (error) {
        console.error("[Clerk] Error clearing token:", error);
      }
    },
  };
};

export const tokenCache = createTokenCache();
