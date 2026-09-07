/**
 * almanacNewsFeed.ts - Core data aggregator for the Almanac News Feed
 *
 * Aggregates world history events across track records, Grade 1 results,
 * market transfers (auctions, claiming, private sales, purchases), and stable events,
 * enriching them with real-world calendar dates, relative day timestamps, and entity metadata.
 */

import { gameCalendarDate, gameYearNumber, relativeDayLabel } from "@/core/calendar/dateFormatting";
import { formatCurrency, formatTime } from "@/core/common/formatting";
import type { NewsItem, EntityLink } from "@/services/narrative/newsTypes";
import type { TrackRecord, SeasonRecord } from "@/core/history/historyTypes";
import type { Transaction } from "@/core/transactions/transactionTypes";
import type { Horse } from "@/core/horse/types";

export type AlmanacFeedCategory = "all" | "track" | "transfer" | "stable";

export interface AlmanacFeedItem {
  id: string;
  day: number;
  year: number;
  calendarDate: string;
  relativeDate: string;
  category: "track" | "transfer" | "stable";
  subcategory: string;
  headline: string;
  detail: string;
  importance?: "high" | "medium" | "low";
  entityLinks?: EntityLink[];
  meta?: {
    trackName?: string;
    horseName?: string;
    horseId?: string;
    price?: number;
    grade?: string;
    time?: number;
    winnerName?: string;
    jockeyName?: string;
    stableName?: string;
  };
}

export interface AlmanacFeedFilterOptions {
  category: AlmanacFeedCategory;
  searchQuery?: string;
  year?: number;
}

export interface BuildAlmanacNewsFeedParams {
  news?: NewsItem[];
  archivedNews?: NewsItem[];
  trackRecords?: Record<string, TrackRecord>;
  seasonRecords?: SeasonRecord[];
  transactions?: Transaction[];
  horses?: Record<string, Horse>;
  currentDay: number;
}

/**
 * Normalizes text to lowercase alphanumeric string for matching.
 * @param str
 */
function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Builds the comprehensive list of news feed events for the Almanac.
 * @param root0
 * @param root0.news
 * @param root0.archivedNews
 * @param root0.trackRecords
 * @param root0.seasonRecords
 * @param root0.transactions
 * @param root0.horses
 * @param root0.currentDay
 */
export function buildAlmanacNewsFeed({
  news = [],
  archivedNews = [],
  trackRecords = {},
  seasonRecords = [],
  transactions = [],
  horses = {},
  currentDay,
}: BuildAlmanacNewsFeedParams): AlmanacFeedItem[] {
  const items: AlmanacFeedItem[] = [];
  const seenIds = new Set<string>();

  // 1. Process News Items (Active + Archived)
  const combinedNews = [...news, ...archivedNews];

  for (const n of combinedNews) {
    if (seenIds.has(n.id)) continue;
    seenIds.add(n.id);

    let category: "track" | "transfer" | "stable" = "stable";
    let subcategory = n.category;

    if (n.category === "racing") {
      category = "track";
      subcategory = "racing";
    } else if (n.category === "market") {
      category = "transfer";
      subcategory = "market";
    } else {
      category = "stable";
      subcategory = n.category;
    }

    const year = gameYearNumber(n.day);
    const calendarDate = gameCalendarDate(n.day);
    const relativeDate = relativeDayLabel(n.day, currentDay);

    items.push({
      id: n.id,
      day: n.day,
      year,
      calendarDate,
      relativeDate,
      category,
      subcategory,
      headline: n.headline,
      detail: n.body,
      importance: n.importance,
      entityLinks: n.entityLinks,
    });
  }

  // 2. Synthesize Track Records
  for (const r of Object.values(trackRecords)) {
    const id = `rec-${r.trackId}-${r.surface}-${r.distance}-${r.categoryKind ?? "overall"}-${r.categoryValue ?? ""}-${r.day}`;
    if (seenIds.has(id)) continue;

    // Check if a news item on that day already covers this horse and track record
    const hNorm = normalize(r.horseName);
    const tNorm = normalize(r.trackName);
    const alreadyInNews = combinedNews.some(
      (n) =>
        n.day === r.day &&
        (normalize(n.headline).includes(hNorm) ||
          n.entityLinks?.some((l) => l.type === "horse" && l.id === r.horseId)) &&
        (normalize(n.headline).includes(tNorm) || normalize(n.body).includes(tNorm)),
    );

    if (alreadyInNews) continue;
    seenIds.add(id);

    const year = r.year || gameYearNumber(r.day);
    const calendarDate = gameCalendarDate(r.day);
    const relativeDate = relativeDayLabel(r.day, currentDay);

    items.push({
      id,
      day: r.day,
      year,
      calendarDate,
      relativeDate,
      category: "track",
      subcategory: "record",
      headline: `${r.horseName} sets ${r.distance}m ${r.surface} record at ${r.trackName}`,
      detail: `Standing record time: ${formatTime(r.time)} (${r.distance}m ${r.surface})${r.raceName ? ` in the ${r.raceName}` : ""}.`,
      importance: "high",
      entityLinks: [
        {
          type: "horse",
          id: r.horseId,
          name: r.horseName,
        },
      ],
      meta: {
        trackName: r.trackName,
        horseName: r.horseName,
        horseId: r.horseId,
        time: r.time,
        grade: r.categoryKind === "grade" ? r.categoryValue : undefined,
      },
    });
  }

  // 3. Synthesize Season Records (Grade 1s)
  for (const s of seasonRecords) {
    const id = `sr-${s.id}`;
    if (seenIds.has(id)) continue;

    // Check if a news item on that day already covers this winner and race
    const wNorm = normalize(s.winnerName);
    const rNorm = normalize(s.raceName);
    const alreadyInNews = combinedNews.some(
      (n) =>
        n.day === s.day &&
        normalize(n.headline).includes(wNorm) &&
        (normalize(n.headline).includes(rNorm) || normalize(n.body).includes(rNorm)),
    );

    if (alreadyInNews) continue;
    seenIds.add(id);

    const year = s.year || gameYearNumber(s.day);
    const calendarDate = gameCalendarDate(s.day);
    const relativeDate = relativeDayLabel(s.day, currentDay);

    items.push({
      id,
      day: s.day,
      year,
      calendarDate,
      relativeDate,
      category: "track",
      subcategory: "grade1",
      headline: `${s.winnerName} wins the ${s.raceName} (${s.grade})`,
      detail: `Ridden to victory by ${s.jockeyName} in ${formatTime(s.time)}.`,
      importance: "high",
      entityLinks: [
        {
          type: "horse",
          id: s.winnerId,
          name: s.winnerName,
        },
        {
          type: "jockey",
          id: s.jockeyId,
          name: s.jockeyName,
        },
        {
          type: "race",
          id: s.raceId,
          name: s.raceName,
        },
      ],
      meta: {
        horseName: s.winnerName,
        horseId: s.winnerId,
        winnerName: s.winnerName,
        jockeyName: s.jockeyName,
        grade: s.grade,
        time: s.time,
      },
    });
  }

  // 4. Synthesize Horse Transfer Transactions
  const transferSubcategories = new Set([
    "claiming_sale",
    "auction_sale",
    "private_sale",
    "horse_purchase",
  ]);

  for (const tx of transactions) {
    if (!transferSubcategories.has(tx.subcategory)) continue;
    const id = `tx-${tx.id}`;
    if (seenIds.has(id)) continue;

    const horse = tx.horseId ? horses[tx.horseId] : undefined;
    let horseName = horse?.name;

    if (!horseName) {
      const match = tx.description.match(
        /(?:Claim of|Purchased|Sold|transfer of)\s+([A-Za-z0-9' -]+)/i,
      );
      if (match) {
        horseName = match[1].trim();
      }
    }

    if (horseName) {
      const hNorm = normalize(horseName);
      const alreadyInNews = combinedNews.some(
        (n) => n.day === tx.day && normalize(n.headline + n.body).includes(hNorm),
      );
      if (alreadyInNews) continue;
    }

    seenIds.add(id);
    const year = gameYearNumber(tx.day);
    const calendarDate = gameCalendarDate(tx.day);
    const relativeDate = relativeDayLabel(tx.day, currentDay);

    let subcategory = "sale";
    let headline = "";

    switch (tx.subcategory) {
      case "claiming_sale":
        subcategory = "claim";
        headline = `Claiming Transfer: ${horseName || "Horse"} claimed for ${formatCurrency(tx.amount)}`;
        break;
      case "auction_sale":
        subcategory = "auction";
        headline = `Auction Sale: ${horseName || "Horse"} hammered down for ${formatCurrency(tx.amount)}`;
        break;
      case "private_sale":
        subcategory = "private_sale";
        headline = `Private Transfer: ${horseName || "Horse"} transferred for ${formatCurrency(tx.amount)}`;
        break;
      case "horse_purchase":
        subcategory = "purchase";
        headline = `Horse Acquisition: ${horseName || "Horse"} purchased for ${formatCurrency(tx.amount)}`;
        break;
    }

    items.push({
      id,
      day: tx.day,
      year,
      calendarDate,
      relativeDate,
      category: "transfer",
      subcategory,
      headline,
      detail: tx.description,
      importance: tx.amount > 200000 ? "high" : "medium",
      entityLinks:
        tx.horseId && horseName ? [{ type: "horse", id: tx.horseId, name: horseName }] : undefined,
      meta: {
        horseName,
        horseId: tx.horseId,
        price: tx.amount,
      },
    });
  }

  // Sort descending by day (newest first), then by id
  return items.sort((a, b) => b.day - a.day || b.id.localeCompare(a.id));
}

/**
 * Pure filtering function for the Almanac News Feed.
 * @param items
 * @param root0
 * @param root0.category
 * @param root0.searchQuery
 * @param root0.year
 */
export function filterAlmanacNewsFeed(
  items: AlmanacFeedItem[],
  { category, searchQuery, year }: AlmanacFeedFilterOptions,
): AlmanacFeedItem[] {
  let result = items;

  // Filter by category
  if (category !== "all") {
    result = result.filter((i) => i.category === category);
  }

  // Filter by year
  if (year !== undefined) {
    result = result.filter((i) => i.year === year);
  }

  // Filter by search query
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    result = result.filter((i) => {
      if (i.headline.toLowerCase().includes(q)) return true;
      if (i.detail.toLowerCase().includes(q)) return true;
      if (i.meta?.horseName?.toLowerCase().includes(q)) return true;
      if (i.meta?.trackName?.toLowerCase().includes(q)) return true;
      if (i.meta?.stableName?.toLowerCase().includes(q)) return true;
      if (i.meta?.winnerName?.toLowerCase().includes(q)) return true;
      if (i.meta?.jockeyName?.toLowerCase().includes(q)) return true;
      if (i.subcategory.toLowerCase().includes(q)) return true;
      return false;
    });
  }

  return result;
}
