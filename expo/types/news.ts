export type NewsCategory = "all" | "politics" | "entertainment" | "sports" | "business" | "tech";

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: NewsCategory;
  source: string;
  sourceIcon: string;
  author: string;
  imageUrl: string;
  publishedAt: string;
  readTime: number;
  tags: string[];
  likes: number;
  comments: number;
  shares: number;
}

export interface CategoryItem {
  key: NewsCategory;
  label: string;
  icon: string;
}
