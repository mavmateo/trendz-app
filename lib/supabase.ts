import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log("[Supabase] URL exists:", !!supabaseUrl);
console.log("[Supabase] Anon key exists:", !!supabaseAnonKey);

let supabase: SupabaseClient;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: Platform.OS !== "web",
      autoRefreshToken: true,
    },
  });
} else {
  console.warn("[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY — using placeholder");
  supabase = createClient("https://placeholder.supabase.co", "placeholder-key", {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export { supabase };

export interface DbArticle {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  source: string;
  source_icon: string;
  author: string;
  image_url: string;
  published_at: string;
  read_time: number;
  tags: string[];
  likes: number;
  comments: number;
  shares: number;
  created_at: string;
}

export interface DbBookmark {
  id: string;
  user_id: string;
  article_id: string;
  created_at: string;
}

export interface DbScrapeSource {
  id: string;
  name: string;
  url: string;
  type: string;
  category: string;
  is_active: boolean;
  last_scraped_at: string | null;
  created_at: string;
}
