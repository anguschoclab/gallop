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
