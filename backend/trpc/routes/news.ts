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

const X_ACCOUNT_SOURCES = [
  { handle: "SIKAOFFICIAL1", name: "SIKA Official", url: "https://x.com/SIKAOFFICIAL1", category: "politics", icon: "🔥" },
  { handle: "withAlvin__", name: "Alvin", url: "https://x.com/withAlvin__", category: "business", icon: "📊" },
  { handle: "eddie_wrt", name: "Eddie WRT", url: "https://x.com/eddie_wrt", category: "entertainment", icon: "✍️" },
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

  triggerDailyScrape: publicProcedure.mutation(async () => {
    console.log("[Scraper] Triggering daily scrape directly via tRPC...");

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
        console.error(`[Scraper] ${msg}`);
        results.errors.push(msg);
      }
    }

    if (allArticles.length > 0) {
      try {
        const inserted = await supabaseAdmin("articles", {
          method: "POST",
          headers: { Prefer: "return=representation,resolution=merge-duplicates" } as any,
          body: JSON.stringify(allArticles),
        });
        results.totalInserted = inserted.length;
        console.log(`[Scraper] Inserted ${inserted.length} articles`);
      } catch (error) {
        const msg = `Insert error: ${error}`;
        console.error(`[Scraper] ${msg}`);
        results.errors.push(msg);
      }
    }

    console.log(`[Scraper] Daily scrape done. RSS: ${results.rssArticles}, Inserted: ${results.totalInserted}`);
    return { success: true, ...results };
  }),

  getLastScrapeTime: publicProcedure.query(async () => {
    try {
      const data = await supabaseAdmin(
        "articles?select=created_at&order=created_at.desc&limit=1"
      );
      if (data && data.length > 0) {
        return { lastScrape: data[0].created_at };
      }
      return { lastScrape: null };
    } catch {
      return { lastScrape: null };
    }
  }),

  getSources: publicProcedure.query(() => {
    return GHANA_RSS_SOURCES.map((s) => ({
      name: s.name,
      url: s.url,
      category: s.category,
      icon: s.icon,
    }));
  }),

  getXSources: publicProcedure.query(() => {
    return X_ACCOUNT_SOURCES.map((s) => ({
      handle: s.handle,
      name: s.name,
      url: s.url,
      category: s.category,
      icon: s.icon,
    }));
  }),

  seedMockData: publicProcedure.mutation(async () => {
    console.log("[Seed] Inserting curated articles from X sources into Supabase...");

    const mockArticles = [
      {
        title: "Korle Bu Hospital Scandal: Engineer Dies After Being Turned Away by 3 Hospitals",
        summary: "Charles Amissah, a 45-year-old engineer, died after three hospitals in Accra refused to treat him due to the 'no-bed syndrome.' Staff at Korle Bu have been suspended pending investigation.",
        body: "Ghana is reeling from nationwide outrage after Charles Amissah, a 45-year-old engineer, died after being turned away by three hospitals in Accra, including the country's premier healthcare facility, Korle Bu Teaching Hospital.\n\nAmissah was rushed to Korle Bu after suffering a severe cardiac episode at his home in Dansoman on February 18, 2026. According to his family, they were told no beds were available and were redirected to two other facilities, both of which also cited capacity constraints. By the time he was finally admitted at a private clinic, it was too late.\n\nThree members of staff at Korle Bu have been suspended pending a full investigation. The Ghana Medical Association has called for an emergency review of hospital protocols. President Mahama described the death as 'unacceptable' and pledged to fast-track emergency healthcare reforms.",
        category: "politics",
        source: "@SIKAOFFICIAL1",
        source_icon: "🏥",
        author: "SIKA Official",
        image_url: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80",
        published_at: new Date(Date.now() - 2 * 3600000).toISOString(),
        read_time: 5,
        tags: ["Healthcare", "Korle Bu", "No-Bed Syndrome"],
        likes: 12450, comments: 4521, shares: 6789,
      },
      {
        title: "Ghana GDP Surpasses $100 Billion — Mahama Holds Private Sector Dialogue",
        summary: "Ghana's economy officially crosses the $100 billion GDP mark, projected to hit $140 billion by 2028. President Mahama convenes business leaders for economic transformation talks.",
        body: "Ghana has achieved a major economic milestone as its GDP officially surpassed the $100 billion mark. Finance Minister Dr. Cassiel Ato Forson made the announcement during a press briefing in Accra.\n\nPresident John Mahama subsequently convened a landmark private sector dialogue at the Jubilee House, bringing together over 200 top business leaders. GDP is projected to reach $140 billion by 2028 under the 'Accra Reset' economic framework.\n\nInternational financial institutions have praised Ghana's fiscal discipline, with the IMF noting the country's successful exit from its Extended Credit Facility programme.",
        category: "business",
        source: "@withAlvin__",
        source_icon: "💰",
        author: "Alvin",
        image_url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
        published_at: new Date(Date.now() - 3 * 3600000).toISOString(),
        read_time: 6,
        tags: ["GDP", "Economy", "Mahama"],
        likes: 8934, comments: 2341, shares: 3102,
      },
      {
        title: "Shatta Wale's Lamborghini Seized by EOCO — Shaxi Investor Petitions",
        summary: "The Economic and Organised Crime Office seizes Shatta Wale's luxury Lamborghini after a Shaxi ride-hailing investor petitions over alleged financial mismanagement.",
        body: "Dancehall artiste Shatta Wale is in the spotlight for all the wrong reasons after EOCO seized his luxury Lamborghini following a petition from an investor in his Shaxi ride-hailing platform.\n\nThe investor, who reportedly put GH₵2.5 million into Shaxi, alleges that Shatta Wale mismanaged the funds and failed to deliver on promised returns. Multiple investors have come forward with similar complaints.\n\nShatta Wale's legal team has denied the allegations, calling the seizure 'politically motivated.' Despite the controversy, his new single 'Nonstop' has been trending on music charts.",
        category: "entertainment",
        source: "@eddie_wrt",
        source_icon: "🎤",
        author: "Eddie WRT",
        image_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
        published_at: new Date(Date.now() - 4 * 3600000).toISOString(),
        read_time: 5,
        tags: ["Shatta Wale", "EOCO", "Shaxi"],
        likes: 15670, comments: 5432, shares: 8901,
      },
      {
        title: "Mahama to Present Historic Slave Trade Resolution to UN General Assembly",
        summary: "President Mahama will present a resolution on March 25 seeking global recognition of the Transatlantic Slave Trade as a crime against humanity.",
        body: "President Mahama is set to make history on March 25, 2026, presenting a landmark resolution to the UN General Assembly seeking global acknowledgment of the Transatlantic Slave Trade as a crime against humanity.\n\nThe initiative has already been adopted by the African Union. It includes formal recognition under international law, a global framework for reparatory justice, and a proposed Decade of Reparations (2027-2037).\n\nThe Caribbean Community (CARICOM) has pledged to co-sponsor the resolution, adding significant diplomatic weight.",
        category: "politics",
        source: "@SIKAOFFICIAL1",
        source_icon: "🇬🇭",
        author: "SIKA Official",
        image_url: "https://images.unsplash.com/photo-1523050854058-8df90110c476?w=800&q=80",
        published_at: new Date(Date.now() - 5 * 3600000).toISOString(),
        read_time: 6,
        tags: ["UN", "Reparations", "Slave Trade"],
        likes: 9870, comments: 3456, shares: 5345,
      },
      {
        title: "Black Stars Get Massive World Cup Budget — Austria Friendly Confirmed",
        summary: "Parliament allocates GH₵150M for World Cup preparations. Five new technical staff appointed and Austria friendly match confirmed for March.",
        body: "Ghana's World Cup preparations have received a massive boost after Parliament confirmed a GH₵150 million allocation. The GFA has announced a friendly match against Austria in March.\n\nThe preparation plan includes pre-tournament camp in the US, friendly matches against European sides, and five new technical appointments including performance analysts and fitness specialists.\n\nGFA President Kurt Okraku stated: 'We are leaving nothing to chance. Ghana's fifth World Cup appearance must be our best yet.'",
        category: "sports",
        source: "@withAlvin__",
        source_icon: "⚽",
        author: "Alvin",
        image_url: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80",
        published_at: new Date(Date.now() - 5 * 3600000).toISOString(),
        read_time: 5,
        tags: ["Black Stars", "World Cup", "Austria"],
        likes: 7621, comments: 1892, shares: 2203,
      },
      {
        title: "Cocoa Farmgate Price Slashed — Farmers Warn of Industry Collapse",
        summary: "Government reduces cocoa farmgate price amid new domestic bond financing model. Farmers threaten to switch to illegal mining if prices don't recover.",
        body: "Cocoa farmers across Ghana are up in arms after the government announced a reduction in the farmgate price, citing the transition to domestic bond financing.\n\nThe new price of GH₵41,392 per metric ton does not adequately compensate for rising input costs. The Ghana Cocoa Farmers Association warned: 'If this continues, many farmers will abandon farms for galamsey.'\n\nInternational cocoa buyers are watching closely, as disruption in Ghana's output could send global prices soaring.",
        category: "business",
        source: "@SIKAOFFICIAL1",
        source_icon: "🍫",
        author: "SIKA Official",
        image_url: "https://images.unsplash.com/photo-1606913084603-3e7702b01627?w=800&q=80",
        published_at: new Date(Date.now() - 6 * 3600000).toISOString(),
        read_time: 6,
        tags: ["Cocoa", "Farming", "COCOBOD"],
        likes: 5321, comments: 1876, shares: 2234,
      },
      {
        title: "Dope Nation's 'Kakalika' Debuts at #13 on UK Afrobeats Chart",
        summary: "The Ghanaian duo's Amapiano-infused hit breaks into the Official UK Afrobeats Chart. Black Sherif also drops new visuals.",
        body: "Dope Nation's 'Kakalika' debuted at number 13 on the Official UK Afrobeats Chart. The Amapiano-infused track has sparked viral dance challenges across TikTok and Instagram.\n\nMeanwhile, Black Sherif dropped visuals for his debut 2026 single, E.L signed with Sony Music Publishing West Africa, and Arathejay released the 'TALISMAN' video featuring Stonebwoy.\n\nGhanaian music collectively garnered over 2 billion streams across platforms in 2025, a figure expected to double in 2026.",
        category: "entertainment",
        source: "@eddie_wrt",
        source_icon: "🎵",
        author: "Eddie WRT",
        image_url: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80",
        published_at: new Date(Date.now() - 7 * 3600000).toISOString(),
        read_time: 4,
        tags: ["Dope Nation", "Kakalika", "UK Charts"],
        likes: 6450, comments: 1532, shares: 3672,
      },
      {
        title: "MTN Ghana Pumps $1.1 Billion Into AI-Powered Network Expansion",
        summary: "MTN Ghana partners with Huawei for AI-driven network upgrades and commits $2M to the 'One Million Coders Programme.'",
        body: "MTN Ghana has announced a US$1.1 billion investment in AI-powered network infrastructure in partnership with Huawei, the largest telecom investment in Ghana's history.\n\nThe investment will deploy AI across MTN's entire network, accelerate 5G rollout across all 16 regions, and expand rural connectivity to 95% population coverage.\n\nSeparately, MTN committed US$2 million to the 'One Million Coders Programme' to train Ghanaians in digital skills.",
        category: "tech",
        source: "@withAlvin__",
        source_icon: "📡",
        author: "Alvin",
        image_url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80",
        published_at: new Date(Date.now() - 8 * 3600000).toISOString(),
        read_time: 5,
        tags: ["MTN", "Huawei", "AI", "5G"],
        likes: 4340, comments: 789, shares: 1567,
      },
      {
        title: "Bagbin Pushes Emergency Care Law After Hospital Death Scandal",
        summary: "Speaker Bagbin calls for legislation to criminalize hospitals that refuse patients in life-threatening conditions.",
        body: "Speaker Alban Bagbin has called for emergency legislation that would criminalize hospitals that turn away patients in life-threatening conditions.\n\nThe proposed 'Emergency Healthcare Access Bill' would impose up to 10 years imprisonment for administrators who refuse emergency patients, mandate stabilization protocols, and create a national bed management system.\n\nThe bill is expected to receive bipartisan support. Health advocacy groups have gathered over 100,000 petition signatures.",
        category: "politics",
        source: "@SIKAOFFICIAL1",
        source_icon: "🏛️",
        author: "SIKA Official",
        image_url: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80",
        published_at: new Date(Date.now() - 9 * 3600000).toISOString(),
        read_time: 6,
        tags: ["Bagbin", "Healthcare", "Parliament"],
        likes: 8890, comments: 2456, shares: 4345,
      },
      {
        title: "Fearless Fund Launches in Ghana — $10M Microfinance Fund for Women",
        summary: "US venture capital firm Fearless Fund opens its first African office in Accra with a $10M microfinance initiative for women entrepreneurs.",
        body: "Fearless Fund has launched in Ghana with a $10 million microfinance fund targeting women entrepreneurs. The firm's first African expansion focuses on Accra.\n\nThe fund will provide microloans from GH₵5,000 to GH₵500,000 for women-led businesses across agribusiness, fashion, beauty, and tech, aiming to fund 5,000 businesses within three years.\n\nThe initiative comes as women-led businesses receive only 7% of venture capital in Ghana despite representing 46% of the entrepreneurial workforce.",
        category: "business",
        source: "@eddie_wrt",
        source_icon: "👩‍💼",
        author: "Eddie WRT",
        image_url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80",
        published_at: new Date(Date.now() - 10 * 3600000).toISOString(),
        read_time: 5,
        tags: ["Fearless Fund", "Women", "VC"],
        likes: 4456, comments: 867, shares: 1890,
      },
      {
        title: "Three Ghanaian Startups Sweep 2025 World Summit Awards",
        summary: "Ghana leads globally with the most WSA winners: Vitara (agritech), Abena AI (voice assistant), and HealthStack GH (healthtech).",
        body: "Ghana made history at the 2025 World Summit Awards with three startups among 40 global winners — the highest for any country.\n\nVitara digitizes farm data for smallholder farmers, Abena AI provides an offline voice assistant in Twi, and HealthStack GH predicts disease outbreaks with 85% accuracy.\n\nGhana's tech ecosystem attracted $56 million in startup funding. A new foundation also launched Africa's first comprehensive AI governance platform.",
        category: "tech",
        source: "@withAlvin__",
        source_icon: "🤖",
        author: "Alvin",
        image_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80",
        published_at: new Date(Date.now() - 11 * 3600000).toISOString(),
        read_time: 5,
        tags: ["Startups", "WSA", "Vitara", "Abena AI"],
        likes: 3890, comments: 545, shares: 1278,
      },
      {
        title: "Viral Street Racing Video Sparks Nationwide Road Safety Outrage",
        summary: "Illegal street racing on the Tema Motorway goes viral, triggering calls for crackdowns as road deaths rise 23% year-over-year.",
        body: "A shocking video of illegal street racing on the Tema Motorway has gone viral, sparking nationwide outrage. Vehicles were clocked at over 200 km/h, narrowly missing a commercial bus.\n\nGhana Police have identified three suspects and seized two vehicles. The NRSA reports road deaths increased 23% year-over-year.\n\nTransport Minister pledged new legislation mandating speed limiters and increasing fines for reckless driving tenfold.",
        category: "politics",
        source: "@SIKAOFFICIAL1",
        source_icon: "🚗",
        author: "SIKA Official",
        image_url: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&q=80",
        published_at: new Date(Date.now() - 12 * 3600000).toISOString(),
        read_time: 5,
        tags: ["Road Safety", "Street Racing"],
        likes: 7890, comments: 3456, shares: 5345,
      },
      {
        title: "VALCO Revival Needs $600M — GIADEC Pushes Integrated Aluminium Vision",
        summary: "Reviving VALCO and building an alumina refinery will cost $600M but could generate $2B in annual revenue and 25,000 jobs.",
        body: "GIADEC has unveiled a plan to revive VALCO and build a fully integrated aluminium industry at an estimated cost of $600 million.\n\nThe plan includes $350M for smelter rehabilitation, $200M for a new alumina refinery, and potential to generate $2 billion in annual revenue with 25,000 direct and indirect jobs.\n\nFunding discussions are ongoing with Chinese, Indian, and Gulf state investors, plus the African Development Bank.",
        category: "business",
        source: "@withAlvin__",
        source_icon: "🏭",
        author: "Alvin",
        image_url: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&q=80",
        published_at: new Date(Date.now() - 13 * 3600000).toISOString(),
        read_time: 6,
        tags: ["VALCO", "GIADEC", "Aluminium"],
        likes: 3567, comments: 867, shares: 1192,
      },
      {
        title: "AI Tools Now Available in Twi, Ewe, and Dagbani for Schools",
        summary: "A Ghanaian edtech startup launches AI-powered learning tools in local languages, reaching 500 schools across three regions.",
        body: "KasaLearn has launched AI-powered learning tools in Twi, Ewe, and Dagbani, deployed across 500 schools in the Northern, Volta, and Ashanti regions.\n\nThe platform provides AI tutoring in math, science, and English in local languages, with offline functionality for areas with limited internet. 2,000 teachers are being trained.\n\nEarly pilot results show a 34% improvement in reading comprehension scores. UNESCO has expressed interest in the model as a template for other African countries.",
        category: "tech",
        source: "@SIKAOFFICIAL1",
        source_icon: "📚",
        author: "SIKA Official",
        image_url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80",
        published_at: new Date(Date.now() - 15 * 3600000).toISOString(),
        read_time: 5,
        tags: ["AI", "Education", "Local Languages"],
        likes: 4890, comments: 678, shares: 1567,
      },
      {
        title: "GFA Confirms Five New Black Stars Technical Appointments",
        summary: "Performance analysts, fitness specialists, and set-piece coaches added to the Black Stars bench as World Cup preparations intensify.",
        body: "The GFA has confirmed five new technical appointments: a performance analyst, fitness specialist, set-piece coach, goalkeeping coach, and youth integration coordinator.\n\nThe appointments follow a rigorous process involving candidates from three continents. Technical Director Bernhard Lippert oversaw the selection.\n\nFormer coach Kwesi Appiah praised the moves: 'This is the kind of investment that separates good teams from great ones at the World Cup.'",
        category: "sports",
        source: "@eddie_wrt",
        source_icon: "⚽",
        author: "Eddie WRT",
        image_url: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&q=80",
        published_at: new Date(Date.now() - 16 * 3600000).toISOString(),
        read_time: 4,
        tags: ["GFA", "Black Stars", "World Cup"],
        likes: 4456, comments: 978, shares: 1290,
      },
      {
        title: "Mahama Inaugurates Presidential Advisory Group for 'Accra Reset'",
        summary: "A 15-member team of economists, technocrats, and business leaders appointed to drive Ghana's economic transformation agenda.",
        body: "President Mahama has inaugurated a 15-member Presidential Advisory Group for the 'Accra Reset' economic transformation agenda.\n\nThe group includes former Google Ghana country manager Estelle Akofio-Sowah, UG Business School's Professor Gyeke-Dako, and diaspora representatives. They'll advise on ending foreign cocoa financing, halting unprocessed ore exports, and building $20B in reserves.\n\nMahama charged: 'Ghana cannot afford business as usual. The Accra Reset is a comprehensive reimagining of how this country generates wealth.'",
        category: "politics",
        source: "@eddie_wrt",
        source_icon: "🏛️",
        author: "Eddie WRT",
        image_url: "https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=800&q=80",
        published_at: new Date(Date.now() - 14 * 3600000).toISOString(),
        read_time: 5,
        tags: ["Accra Reset", "Advisory Group", "Mahama"],
        likes: 5890, comments: 1521, shares: 2345,
      },
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
