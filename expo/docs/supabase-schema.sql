-- Trendz App - Supabase Database Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('politics', 'entertainment', 'sports', 'business', 'tech')),
  source TEXT NOT NULL,
  source_icon TEXT DEFAULT '🌐',
  author TEXT NOT NULL,
  image_url TEXT NOT NULL,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  read_time INTEGER DEFAULT 5,
  tags TEXT[] DEFAULT '{}',
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookmarks table (for future Clerk user sync)
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

-- Scrape sources table
CREATE TABLE IF NOT EXISTS scrape_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rss', 'twitter', 'web')),
  category TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_likes ON articles(likes DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);

-- Enable Row Level Security
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Policies: articles are publicly readable
CREATE POLICY "Articles are publicly readable"
  ON articles FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policies: bookmarks are user-specific
CREATE POLICY "Users can read own bookmarks"
  ON bookmarks FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own bookmarks"
  ON bookmarks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own bookmarks"
  ON bookmarks FOR DELETE
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Allow service role to manage articles (for scraper)
CREATE POLICY "Service role can manage articles"
  ON articles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
