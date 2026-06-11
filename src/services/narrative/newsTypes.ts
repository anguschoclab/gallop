/**
 * narrative/newsTypes.ts - News types
 *
 * This file provides types for news items including categories, importance levels,
 * entity links, and news item structure.
 *
 * Dependencies: None
 * Related files: None
 */

export type NewsCategory = "racing" | "market" | "stable" | "flavor" | "milestone";
export type NewsImportance = "high" | "medium" | "low";

export interface EntityLink {
  type: "horse" | "jockey" | "stable" | "race";
  id: string;
  name: string;
}

export interface NewsItem {
  id: string;
  day: number;
  category: NewsCategory;
  importance: NewsImportance;
  headline: string;
  body: string;
  entityLinks?: EntityLink[];
}
