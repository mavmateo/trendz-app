import { Context } from "hono";
import { generateObject } from "@rork-ai/toolkit-sdk";
import { z } from "zod";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const CRON_SECRET = process.env.CRON_SECRET ?? "";

async function supabaseAdmin(path: string, options: RequestInit = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: "return=representation",
      ...((options.headers as Record<string, string>) ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[Cron Supabase] Error:", res.status, text);
    throw new Error(`Supabase error: ${res.status} ${text}`);
  }
  return res.json();
}

const GHANA_RSS_SOURCES = [
  { name: "GhanaWeb", url: "https://www.ghanaweb.com/GhanaHomePage/NewsArchive/rss.xml", category: "politics", icon: "🌐" },
  { name: "MyJoyOnline", url: "https://www.myjoyonline.com/feed/", category: "politics", icon: "📰" },
  { name: "Citi FM", url: "https://citifmonline.com/feed/", category: "politics", icon: "🏛️" },
  { name: "Pulse Ghana", url: "https://www.pulse.com.gh/feed", category: "entertainment", icon: "🎵" },
  { name: "GhanaWeb Sports", url: "https://www.ghanaweb.com/GhanaHomePage/SportsArchive/rss.xml", category: "sports", icon: "⚽" },
  { name: "Business Ghana", url: "https://www.businessghana.com/site/rss", category: "business", icon: "💰" },
];

const X_ACCOUNTS = [
  { handle: "SIKAOFFICIAL1", name: "SIKA Official", categories: ["politics", "business", "tech"], icon: "🔥" },
  { handle: "withAlvin__", name: "Alvin", categories: ["business", "tech", "sports"], icon: "📊" },
  { handle: "eddie_wrt", name: "Eddie WRT", categories: ["entertainment", "politics", "sports"], icon: "✍️" },
];

function extractTextFromXml(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?</${tag}>`, "s");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

function extractAllItems(xml: string): string[] {
  const items: string[] = [];
  const regex = /<item>(.*?)<\/item>/gs;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    items.push(match[1]);
  }
  return items;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function extractImageFromContent(content: string): string {
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/;
  const match = content.match(imgRegex);
  if (match) return match[1];

  const enclosureRegex = /<enclosure[^>]+url=["']([^"']+)["']/;
  const encMatch = content.match(enclosureRegex);
  if (encMatch) return encMatch[1];

  const defaultImages = [
    "https://images.unsplash.com/photo-1504711434969-e33886168d5c?w=800&q=80",
    "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80",
    "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&q=80",
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80",
    "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80",
  ];
  return defaultImages[Math.floor(Math.random() * defaultImages.length)];
}

function categorizeArticle(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  if (/football|soccer|black stars|gpl|afcon|sport|match|goal|stadium|player|coach|league/.test(text)) return "sports";
  if (/music|movie|film|celebrity|entertain|album|concert|artist|actor|actress|nollywood/.test(text)) return "entertainment";
  if (/business|economy|cedi|stock|trade|bank|finance|invest|market|gdp|inflation/.test(text)) return "business";
  if (/tech|digital|ai|startup|software|app|innovation|cyber|internet/.test(text)) return "tech";
  return "politics";
}

async function scrapeRssFeed(source: { name: string; url: string; category: string; icon: string }) {
  try {
    console.log(`[Cron] Fetching RSS from ${source.name}: ${source.url}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: { "User-Agent": "TrendzApp/1.0 NewsAggregator" },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`[Cron] HTTP ${res.status} from ${source.name}`);
      return [];
    }

    const xml = await res.text();
    const items = extractAllItems(xml);
    console.log(`[Cron] Found ${items.length} items from ${source.name}`);

    const articles = items.slice(0, 8).map((item) => {
      const title = stripHtml(extractTextFromXml(item, "title"));
      const description = stripHtml(extractTextFromXml(item, "description"));
      const pubDate = extractTextFromXml(item, "pubDate");
      const content = extractTextFromXml(item, "content:encoded") || extractTextFromXml(item, "content");
      const imageUrl = extractImageFromContent(item + (content || ""));
      const category = categorizeArticle(title, description);

      const wordCount = (description + " " + stripHtml(content || "")).split(/\s+/).length;
      const readTime = Math.max(2, Math.ceil(wordCount / 200));

      return {
        title,
        summary: description.slice(0, 300),
        body: stripHtml(content || description),
        category,
        source: source.name,
        source_icon: source.icon,
        author: extractTextFromXml(item, "dc:creator") || extractTextFromXml(item, "author") || source.name,
        image_url: imageUrl,
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        read_time: readTime,
        tags: [category, source.name.replace(/\s/g, "")],
        likes: Math.floor(Math.random() * 5000),
        comments: Math.floor(Math.random() * 500),
        shares: Math.floor(Math.random() * 1000),
      };
    });

    return articles.filter((a) => a.title && a.title.length > 5);
  } catch (error) {
    console.error(`[Cron] Error scraping ${source.name}:`, error);
    return [];
  }
}

const articleSchema = z.object({
  articles: z.array(
    z.object({
      title: z.string(),
      summary: z.string(),
      body: z.string(),
      category: z.enum(["politics", "entertainment", "sports", "business", "tech"]),
      tags: z.array(z.string()),
      read_time: z.number(),
    })
  ),
});

async function generateXAccountArticles(): Promise<any[]> {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];

  console.log(`[Cron] Generating AI articles for date: ${dateStr}`);

  try {
    const result = await generateObject({
      messages: [
        {
          role: "user",
          content: `You are a Ghana news curator pulling trending stories from X (Twitter) accounts @SIKAOFFICIAL1, @withAlvin__, and @eddie_wrt. These accounts cover Ghana politics, business, entertainment, sports, and tech.

Generate 12 realistic, current Ghana trending news articles for ${dateStr}. Each article should feel like it was sourced from these X accounts discussing real ongoing events in Ghana.

Focus on these real ongoing topics in Ghana:
- President Mahama's government policies and economic reforms
- Ghana cedi performance and economic indicators
- Black Stars football and Ghana Premier League
- Ghanaian music scene (Afrobeats, Amapiano, Highlife)
- Tech startups and digital economy growth
- Cocoa industry and farming
- Healthcare and education reforms
- Infrastructure and energy projects
- Cultural events and social issues

Mix categories: 3 politics, 2 business, 3 entertainment, 2 sports, 2 tech.

Each article must have:
- A compelling, specific headline (not generic)
- A 1-2 sentence summary
- A detailed body (3-5 paragraphs with bullet points where relevant)
- Proper category
- 2-4 relevant tags
- Estimated read_time (3-7 minutes)

Make them feel like real breaking/trending Ghana news that people would be discussing on X today. Use real names of Ghanaian politicians, celebrities, institutions, and places.`,
        },
      ],
      schema: articleSchema,
    });

    const unsplashImages: Record<string, string[]> = {
      politics: [
        "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80",
        "https://images.unsplash.com/photo-1523050854058-8df90110c476?w=800&q=80",
        "https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=800&q=80",
      ],
      business: [
        "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
        "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80",
        "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&q=80",
      ],
      entertainment: [
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
        "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80",
        "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80",
      ],
      sports: [
        "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80",
        "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&q=80",
        "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&q=80",
      ],
      tech: [
        "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80",
        "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80",
        "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80",
      ],
    };

    const sourceIcons: Record<string, string> = {
      politics: "🏛️",
      business: "💰",
      entertainment: "🎤",
      sports: "⚽",
      tech: "🤖",
    };

    const articles = result.articles.map((article, index) => {
      const xAccount = X_ACCOUNTS[index % X_ACCOUNTS.length];
      const images = unsplashImages[article.category] || unsplashImages.politics;
      const imageUrl = images[Math.floor(Math.random() * images.length)];

      return {
        title: article.title,
        summary: article.summary,
        body: article.body,
        category: article.category,
        source: `@${xAccount.handle}`,
        source_icon: sourceIcons[article.category] || "📰",
        author: xAccount.name,
        image_url: imageUrl,
        published_at: new Date(Date.now() - index * 3600000).toISOString(),
        read_time: article.read_time,
        tags: article.tags,
        likes: Math.floor(Math.random() * 15000) + 500,
        comments: Math.floor(Math.random() * 5000) + 100,
        shares: Math.floor(Math.random() * 8000) + 200,
      };
    });

    console.log(`[Cron] Generated ${articles.length} AI articles`);
    return articles;
  } catch (error) {
    console.error("[Cron] Error generating AI articles:", error);
    return [];
  }
}

async function cleanupOldArticles() {
  try {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 3600000).toISOString();
    console.log(`[Cron] Cleaning up articles older than ${cutoffDate}`);

    await supabaseAdmin(`articles?published_at=lt.${cutoffDate}`, {
      method: "DELETE",
    });
    console.log("[Cron] Old articles cleaned up");
  } catch (error) {
    console.error("[Cron] Error cleaning old articles:", error);
  }
}

export async function handleCronScrape(c: Context) {
  const authHeader = c.req.header("Authorization");
  const querySecret = new URL(c.req.url).searchParams.get("secret");
  const providedSecret = authHeader?.replace("Bearer ", "") || querySecret;

  if (CRON_SECRET && providedSecret !== CRON_SECRET) {
    console.error("[Cron] Unauthorized request");
    return c.json({ error: "Unauthorized" }, 401);
  }

  console.log(`[Cron] Starting scheduled scrape at ${new Date().toISOString()}`);

  const results = {
    rssArticles: 0,
    aiArticles: 0,
    totalInserted: 0,
    errors: [] as string[],
    timestamp: new Date().toISOString(),
  };

  const allArticles: any[] = [];

  for (const source of GHANA_RSS_SOURCES) {
    try {
      const articles = await scrapeRssFeed(source);
      allArticles.push(...articles);
      results.rssArticles += articles.length;
    } catch (error) {
      const msg = `RSS error (${source.name}): ${error}`;
      console.error(`[Cron] ${msg}`);
      results.errors.push(msg);
    }
  }

  try {
    const aiArticles = await generateXAccountArticles();
    allArticles.push(...aiArticles);
    results.aiArticles = aiArticles.length;
  } catch (error) {
    const msg = `AI generation error: ${error}`;
    console.error(`[Cron] ${msg}`);
    results.errors.push(msg);
  }

  if (allArticles.length > 0) {
    try {
      const inserted = await supabaseAdmin("articles", {
        method: "POST",
        headers: { Prefer: "return=representation,resolution=merge-duplicates" } as any,
        body: JSON.stringify(allArticles),
      });
      results.totalInserted = inserted.length;
      console.log(`[Cron] Inserted ${inserted.length} articles into Supabase`);
    } catch (error) {
      const msg = `Insert error: ${error}`;
      console.error(`[Cron] ${msg}`);
      results.errors.push(msg);
    }
  }

  try {
    await cleanupOldArticles();
  } catch (error) {
    console.error("[Cron] Cleanup error:", error);
  }

  console.log(`[Cron] Scrape completed. RSS: ${results.rssArticles}, AI: ${results.aiArticles}, Inserted: ${results.totalInserted}`);

  return c.json({
    success: true,
    ...results,
  });
}
