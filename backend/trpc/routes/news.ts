import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

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
    console.error("[Supabase Admin] Error:", res.status, text);
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
  return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, " ").trim();
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
    console.log(`[Scraper] Fetching RSS from ${source.name}: ${source.url}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: { "User-Agent": "TrendzApp/1.0 NewsAggregator" },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`[Scraper] HTTP ${res.status} from ${source.name}`);
      return [];
    }

    const xml = await res.text();
    const items = extractAllItems(xml);
    console.log(`[Scraper] Found ${items.length} items from ${source.name}`);

    const articles = items.slice(0, 10).map((item) => {
      const title = stripHtml(extractTextFromXml(item, "title"));
      const description = stripHtml(extractTextFromXml(item, "description"));
      const link = extractTextFromXml(item, "link");
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
    console.error(`[Scraper] Error scraping ${source.name}:`, error);
    return [];
  }
}

export const newsRouter = createTRPCRouter({
  scrapeAll: publicProcedure.mutation(async () => {
    console.log("[Scraper] Starting full scrape of all sources...");
    const allArticles: any[] = [];

    for (const source of GHANA_RSS_SOURCES) {
      const articles = await scrapeRssFeed(source);
      allArticles.push(...articles);
    }

    console.log(`[Scraper] Total articles scraped: ${allArticles.length}`);

    if (allArticles.length === 0) {
      return { inserted: 0, message: "No articles scraped" };
    }

    try {
      const result = await supabaseAdmin("articles", {
        method: "POST",
        headers: { Prefer: "return=representation,resolution=merge-duplicates" } as any,
        body: JSON.stringify(allArticles),
      });
      console.log(`[Scraper] Inserted ${result.length} articles`);
      return { inserted: result.length, message: "Scrape completed successfully" };
    } catch (error) {
      console.error("[Scraper] Error inserting articles:", error);
      throw error;
    }
  }),

  scrapeSource: publicProcedure
    .input(z.object({ sourceName: z.string() }))
    .mutation(async ({ input }) => {
      const source = GHANA_RSS_SOURCES.find((s) => s.name === input.sourceName);
      if (!source) {
        throw new Error(`Source not found: ${input.sourceName}`);
      }

      const articles = await scrapeRssFeed(source);
      if (articles.length === 0) {
        return { inserted: 0, message: "No articles found" };
      }

      const result = await supabaseAdmin("articles", {
        method: "POST",
        headers: { Prefer: "return=representation,resolution=merge-duplicates" } as any,
        body: JSON.stringify(articles),
      });

      return { inserted: result.length, message: `Scraped ${result.length} from ${source.name}` };
    }),

  getSources: publicProcedure.query(() => {
    return GHANA_RSS_SOURCES.map((s) => ({
      name: s.name,
      url: s.url,
      category: s.category,
      icon: s.icon,
    }));
  }),

  seedMockData: publicProcedure.mutation(async () => {
    console.log("[Seed] Inserting mock articles into Supabase...");

    const mockArticles = [
      {
        title: "Ghana's New Digital Economy Strategy Set to Transform Tech Sector",
        summary: "Government unveils ambitious plan to position Ghana as West Africa's leading tech hub with $500M investment over 5 years.",
        body: "The Government of Ghana has announced a comprehensive Digital Economy Strategy aimed at transforming the country into West Africa's premier technology hub. The plan, which includes a $500 million investment over the next five years, focuses on digital infrastructure, skills development, and creating an enabling environment for tech startups.\n\nKey highlights include expansion of fiber optic networks to cover 95% of the country, establishment of 10 new tech innovation hubs, training programs for 500,000 young Ghanaians in digital skills, tax incentives for tech companies, and a dedicated $50M venture fund for Ghanaian startups.",
        category: "tech",
        source: "GhanaWeb",
        source_icon: "🌐",
        author: "Kwame Asante",
        image_url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80",
        published_at: new Date(Date.now() - 2 * 3600000).toISOString(),
        read_time: 5,
        tags: ["Digital Economy", "Tech"],
        likes: 2340, comments: 189, shares: 456,
      },
      {
        title: "Black Stars Captain Speaks on AFCON 2026 Preparations",
        summary: "Thomas Partey rallies the team as Ghana intensifies training ahead of the Africa Cup of Nations qualifiers.",
        body: "Black Stars captain Thomas Partey has delivered an impassioned speech about the team's preparations for the upcoming Africa Cup of Nations 2026 qualifiers, promising fans that the squad is more determined than ever.\n\nThe team has been engaged in intensive training sessions with a focus on tactical flexibility and set-piece efficiency. Ghana's first qualifier is scheduled against Nigeria in a much-anticipated West African derby.",
        category: "sports",
        source: "Joy Sports",
        source_icon: "⚽",
        author: "Nathaniel Attoh",
        image_url: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80",
        published_at: new Date(Date.now() - 3 * 3600000).toISOString(),
        read_time: 4,
        tags: ["Black Stars", "AFCON"],
        likes: 5621, comments: 892, shares: 1203,
      },
      {
        title: "Parliament Passes Historic Anti-Corruption Bill",
        summary: "The new legislation strengthens accountability measures and establishes an independent anti-corruption commission.",
        body: "In a landmark decision, Ghana's Parliament has passed the much-anticipated Anti-Corruption and Accountability Bill, which establishes an independent commission with sweeping powers to investigate and prosecute corruption cases.\n\nThe bill introduces creation of an Independent Anti-Corruption Commission, mandatory asset declaration for all public officials, whistleblower protection framework, and strict penalties for corruption offenses.",
        category: "politics",
        source: "Citi FM",
        source_icon: "🏛️",
        author: "Umaru Sanda Amadu",
        image_url: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80",
        published_at: new Date(Date.now() - 4 * 3600000).toISOString(),
        read_time: 6,
        tags: ["Parliament", "Anti-Corruption"],
        likes: 8934, comments: 2341, shares: 3102,
      },
      {
        title: "Sarkodie Drops Surprise Album, Breaks Streaming Records",
        summary: "Ghana's rap king releases 'Landlord Legacy' with features from Burna Boy, Stonebwoy, and international acts.",
        body: "Ghanaian rap icon Sarkodie has taken the music world by storm with the surprise release of his highly anticipated album 'Landlord Legacy,' which has already broken multiple streaming records across Africa.\n\nWithin the first 24 hours: over 15 million streams, topped Apple Music charts in 12 African countries, and trending #1 on Twitter/X in Ghana, Nigeria, and the UK.",
        category: "entertainment",
        source: "Pulse Ghana",
        source_icon: "🎵",
        author: "Naa Ashorkor",
        image_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
        published_at: new Date(Date.now() - 5 * 3600000).toISOString(),
        read_time: 4,
        tags: ["Sarkodie", "Music"],
        likes: 12450, comments: 3891, shares: 5672,
      },
      {
        title: "Cedi Strengthens Against Dollar for Third Consecutive Week",
        summary: "Ghana's currency shows resilience as central bank policies and increased cocoa exports boost economic confidence.",
        body: "The Ghana Cedi has continued its impressive recovery against the US Dollar, marking its third consecutive week of gains. The Cedi appreciated by 2.3% this week, building on previous gains.\n\nAnalysts attribute the recovery to Bank of Ghana's disciplined monetary policy, record cocoa export revenues, increased FDI inflows, and growing remittance flows from the diaspora.",
        category: "business",
        source: "Business Ghana",
        source_icon: "💰",
        author: "Ekow Dontoh",
        image_url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
        published_at: new Date(Date.now() - 6 * 3600000).toISOString(),
        read_time: 5,
        tags: ["Cedi", "Economy"],
        likes: 3567, comments: 567, shares: 892,
      },
      {
        title: "Accra to Get Africa's Largest Solar Farm by 2027",
        summary: "A $2 billion renewable energy project aims to power 3 million homes and make Ghana a green energy leader.",
        body: "Ghana is set to host Africa's largest solar farm following the signing of a landmark $2 billion agreement. The project will span over 5,000 acres in the Volta Region with a capacity of 1.5 gigawatts.\n\nThe project will create 15,000 direct jobs during construction and 3,000 permanent operational jobs.",
        category: "tech",
        source: "MyJoyOnline",
        source_icon: "☀️",
        author: "Seth Kwame Boateng",
        image_url: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80",
        published_at: new Date(Date.now() - 7 * 3600000).toISOString(),
        read_time: 5,
        tags: ["Solar", "Energy"],
        likes: 4521, comments: 678, shares: 1345,
      },
      {
        title: "NPP and NDC Clash Over Free SHS Policy Expansion",
        summary: "Political tensions rise as both parties present competing visions for the future of Ghana's education system.",
        body: "Political tensions have escalated as the ruling party and the main opposition present sharply different visions for the expansion of Ghana's Free SHS policy.\n\nThe ruling party proposes extending to tertiary education while the opposition advocates for improving quality of the existing program first.",
        category: "politics",
        source: "Daily Graphic",
        source_icon: "📰",
        author: "Emmanuel Adu-Gyamerah",
        image_url: "https://images.unsplash.com/photo-1523050854058-8df90110c476?w=800&q=80",
        published_at: new Date(Date.now() - 8 * 3600000).toISOString(),
        read_time: 6,
        tags: ["Education", "Free SHS"],
        likes: 6789, comments: 4521, shares: 2345,
      },
      {
        title: "Stonebwoy Sells Out O2 Arena in Record Time",
        summary: "The Bhim Nation president makes history as the first Ghanaian artist to headline and sell out London's iconic venue.",
        body: "Dancehall and Afrobeats superstar Stonebwoy has made history as the first Ghanaian artist to headline and sell out London's iconic O2 Arena, with all 20,000 tickets snapped up in just 35 minutes.\n\nFans from 45 countries purchased tickets, making it the fastest sell-out for an African artist at the O2.",
        category: "entertainment",
        source: "Graphic Showbiz",
        source_icon: "🎤",
        author: "Arnold Asamoah-Baidoo",
        image_url: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80",
        published_at: new Date(Date.now() - 9 * 3600000).toISOString(),
        read_time: 4,
        tags: ["Stonebwoy", "Music"],
        likes: 15670, comments: 5432, shares: 8901,
      },
      {
        title: "Mobile Money Transactions Hit GH₵1 Trillion Mark",
        summary: "Ghana's mobile money ecosystem reaches a historic milestone, reflecting the country's rapid digital financial inclusion.",
        body: "Ghana's mobile money ecosystem has achieved a historic milestone, with total transaction values surpassing GH₵1 trillion for the first time.\n\nKey stats: 22 million active accounts, GH₵2.8 billion daily transactions, and merchant payments grew by 340% year-over-year.",
        category: "business",
        source: "Business & Financial Times",
        source_icon: "📱",
        author: "Dominic Osei",
        image_url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80",
        published_at: new Date(Date.now() - 10 * 3600000).toISOString(),
        read_time: 5,
        tags: ["Mobile Money", "Fintech"],
        likes: 3456, comments: 567, shares: 890,
      },
      {
        title: "Ghanaian AI Startup Raises $15M Series A Funding",
        summary: "mPharma-backed healthtech uses AI to predict disease outbreaks across West Africa.",
        body: "A Ghanaian AI startup focused on healthcare has raised $15 million in Series A funding, one of the largest early-stage investments in Ghana's tech ecosystem.\n\nThe company's technology has been deployed in 50 health facilities with 85% accuracy in predicting malaria outbreaks up to two weeks in advance.",
        category: "tech",
        source: "TechCrunch Africa",
        source_icon: "🤖",
        author: "Tage Kene-Okafor",
        image_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80",
        published_at: new Date(Date.now() - 11 * 3600000).toISOString(),
        read_time: 5,
        tags: ["AI", "Startup"],
        likes: 2890, comments: 345, shares: 678,
      },
    ];

    try {
      const result = await supabaseAdmin("articles", {
        method: "POST",
        body: JSON.stringify(mockArticles),
      });
      return { inserted: result.length, message: "Mock data seeded successfully" };
    } catch (error) {
      console.error("[Seed] Error:", error);
      throw error;
    }
  }),
});
