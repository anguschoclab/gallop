import { describe, it, expect } from "vitest";
import {
  buildAlmanacNewsFeed,
  filterAlmanacNewsFeed,
  type AlmanacFeedItem,
} from "@/core/history/almanacNewsFeed";
import type { NewsItem } from "@/services/narrative/newsTypes";
import type { TrackRecord, SeasonRecord } from "@/core/history/historyTypes";
import type { Transaction } from "@/core/transactions/transactionTypes";
import type { Horse } from "@/core/horse/types";

function mkNews(overrides: Partial<NewsItem> & { id: string; day: number }): NewsItem {
  return {
    category: "racing",
    importance: "normal" as never,
    headline: "Default Headline",
    body: "Default body narrative.",
    ...overrides,
  };
}

function mkTrackRecord(
  overrides: Partial<TrackRecord> & { trackId: string; horseId: string },
): TrackRecord {
  return {
    trackName: "Belmont Park",
    surface: "Dirt",
    distance: 2000,
    time: 120.5,
    horseName: "Thunder Run",
    day: 15,
    year: 2026,
    ...overrides,
  };
}

function mkSeasonRecord(overrides: Partial<SeasonRecord> & { id: string }): SeasonRecord {
  return {
    year: 2026,
    day: 20,
    raceId: "r1",
    raceName: "Gold Cup",
    winnerId: "h1",
    winnerName: "Thunder Run",
    winnerSilk: "#fff",
    time: 121.2,
    jockeyId: "j1",
    jockeyName: "John Smith",
    grade: "G1",
    isPlayerOwned: false,
    ...overrides,
  };
}

function mkTransaction(overrides: Partial<Transaction> & { id: string; day: number }): Transaction {
  return {
    type: "transfer",
    subcategory: "auction_sale",
    amount: 150000,
    description: "Sold at Keeneland Auction",
    balanceAfter: 500000,
    recurring: false,
    ...overrides,
  };
}

describe("almanacNewsFeed", () => {
  describe("buildAlmanacNewsFeed", () => {
    it("categorizes news items correctly into track, transfer, and stable", () => {
      const news: NewsItem[] = [
        mkNews({ id: "n1", day: 10, category: "racing", headline: "Spectacular Win" }),
        mkNews({ id: "n2", day: 11, category: "market", headline: "Horse Sold for Millions" }),
        mkNews({ id: "n3", day: 12, category: "stable", headline: "New Stable Facilities" }),
        mkNews({ id: "n4", day: 13, category: "milestone", headline: "100th Career Victory" }),
        mkNews({ id: "n5", day: 14, category: "flavor", headline: "Morning Track Gossip" }),
      ];

      const feed = buildAlmanacNewsFeed({
        news,
        currentDay: 20,
      });

      const catMap = new Map(feed.map((i) => [i.id, i.category]));
      expect(catMap.get("n1")).toBe("track");
      expect(catMap.get("n2")).toBe("transfer");
      expect(catMap.get("n3")).toBe("stable");
      expect(catMap.get("n4")).toBe("stable");
      expect(catMap.get("n5")).toBe("stable");
    });

    it("ingests archived news alongside active news", () => {
      const activeNews = [mkNews({ id: "active-1", day: 70, headline: "Recent Event" })];
      const archivedNews = [mkNews({ id: "archived-1", day: 5, headline: "Old Event" })];

      const feed = buildAlmanacNewsFeed({
        news: activeNews,
        archivedNews,
        currentDay: 75,
      });

      const ids = feed.map((i) => i.id);
      expect(ids).toContain("active-1");
      expect(ids).toContain("archived-1");
    });

    it("synthesizes track record events from trackRecords", () => {
      const trackRecords: Record<string, TrackRecord> = {
        rec1: mkTrackRecord({
          trackId: "belmont",
          horseId: "h1",
          horseName: "Silver Bullet",
          distance: 1600,
          surface: "Turf",
          time: 93.4,
          trackName: "Belmont Park",
          day: 30,
        }),
      };

      const feed = buildAlmanacNewsFeed({
        trackRecords,
        currentDay: 35,
      });

      const recordItem = feed.find((i) => i.category === "track" && i.subcategory === "record");
      expect(recordItem).toBeDefined();
      expect(recordItem?.headline).toContain("Silver Bullet");
      expect(recordItem?.headline).toContain("Belmont Park");
      expect(recordItem?.detail).toContain("1600m Turf");
      expect(recordItem?.meta?.trackName).toBe("Belmont Park");
      expect(recordItem?.meta?.horseName).toBe("Silver Bullet");
    });

    it("synthesizes Grade 1 championship victory events from seasonRecords", () => {
      const seasonRecords = [
        mkSeasonRecord({
          id: "sr1",
          day: 45,
          raceName: "Breeders Classic",
          winnerName: "Golden Pegasus",
          grade: "G1",
          jockeyName: "Alice Walker",
        }),
      ];

      const feed = buildAlmanacNewsFeed({
        seasonRecords,
        currentDay: 50,
      });

      const g1Item = feed.find((i) => i.subcategory === "grade1");
      expect(g1Item).toBeDefined();
      expect(g1Item?.category).toBe("track");
      expect(g1Item?.headline).toContain("Golden Pegasus");
      expect(g1Item?.headline).toContain("Breeders Classic");
      expect(g1Item?.detail).toContain("Alice Walker");
    });

    it("synthesizes horse transfers from transactions (claims, auctions, sales, purchases)", () => {
      const transactions = [
        mkTransaction({
          id: "tx1",
          day: 12,
          subcategory: "claiming_sale",
          amount: 25000,
          description: "Claim of Quickstep",
          horseId: "h-quick",
        }),
        mkTransaction({
          id: "tx2",
          day: 15,
          subcategory: "horse_purchase",
          amount: 80000,
          description: "Purchased Starlight at market",
          horseId: "h-star",
        }),
      ];

      const horses = {
        "h-quick": { id: "h-quick", name: "Quickstep" } as unknown as Horse,
        "h-star": { id: "h-star", name: "Starlight" } as unknown as Horse,
      };

      const feed = buildAlmanacNewsFeed({
        transactions,
        horses,
        currentDay: 20,
      });

      const claimItem = feed.find((i) => i.subcategory === "claim");
      expect(claimItem).toBeDefined();
      expect(claimItem?.category).toBe("transfer");
      expect(claimItem?.headline).toContain("Quickstep");
      expect(claimItem?.meta?.price).toBe(25000);

      const purchaseItem = feed.find((i) => i.subcategory === "purchase");
      expect(purchaseItem).toBeDefined();
      expect(purchaseItem?.category).toBe("transfer");
      expect(purchaseItem?.headline).toContain("Starlight");
      expect(purchaseItem?.meta?.price).toBe(80000);
    });

    it("deduplicates identical events between news items and records/transactions", () => {
      // News item for the same race win
      const news = [
        mkNews({
          id: "news-goldcup",
          day: 20,
          category: "racing",
          headline: "Thunder Run Dominates in Gold Cup!",
          body: "A stellar G1 performance.",
        }),
      ];

      // Season record on the same day with same winner and race
      const seasonRecords = [
        mkSeasonRecord({
          id: "sr-goldcup",
          day: 20,
          raceName: "Gold Cup",
          winnerName: "Thunder Run",
          grade: "G1",
        }),
      ];

      const feed = buildAlmanacNewsFeed({
        news,
        seasonRecords,
        currentDay: 25,
      });

      // Should only have 1 item for Gold Cup, not 2
      const goldCupItems = feed.filter(
        (i) => i.headline.includes("Gold Cup") || i.detail.includes("Gold Cup"),
      );
      expect(goldCupItems.length).toBe(1);
      expect(goldCupItems[0].category).toBe("track");
    });

    it("formats real-world calendar dates and relative dates accurately", () => {
      const news = [
        mkNews({ id: "n1", day: 1, headline: "Day 1 Event" }),
        mkNews({ id: "n2", day: 15, headline: "Day 15 Event" }),
      ];

      const feed = buildAlmanacNewsFeed({
        news,
        currentDay: 15,
      });

      const day1 = feed.find((i) => i.day === 1);
      const day15 = feed.find((i) => i.day === 15);

      expect(day1?.calendarDate).toBe("Jan 2, 2026");
      expect(day1?.relativeDate).toBe("14 days ago");

      expect(day15?.calendarDate).toBe("Jan 16, 2026");
      expect(day15?.relativeDate).toBe("Today");
    });

    it("sorts all items chronologically descending by game day", () => {
      const news = [
        mkNews({ id: "n-day5", day: 5, headline: "Day 5" }),
        mkNews({ id: "n-day25", day: 25, headline: "Day 25" }),
        mkNews({ id: "n-day15", day: 15, headline: "Day 15" }),
      ];

      const feed = buildAlmanacNewsFeed({
        news,
        currentDay: 30,
      });

      expect(feed.map((i) => i.day)).toEqual([25, 15, 5]);
    });

    it("handles empty or partial inputs gracefully", () => {
      const feed = buildAlmanacNewsFeed({ currentDay: 1 });
      expect(feed).toEqual([]);
    });
  });

  describe("filterAlmanacNewsFeed", () => {
    const sampleFeed: AlmanacFeedItem[] = [
      {
        id: "1",
        day: 10,
        year: 2026,
        calendarDate: "Jan 10, 2026",
        relativeDate: "10 days ago",
        category: "track",
        subcategory: "record",
        headline: "Secretariat breaks record at Belmont Park",
        detail: "Fastest time on 2400m Dirt.",
        meta: { horseName: "Secretariat", trackName: "Belmont Park" },
      },
      {
        id: "2",
        day: 15,
        year: 2026,
        calendarDate: "Jan 15, 2026",
        relativeDate: "5 days ago",
        category: "transfer",
        subcategory: "auction",
        headline: "Seattle Slew sold for $1,200,000 at Keeneland",
        detail: "Top lot of the evening session.",
        meta: { horseName: "Seattle Slew", price: 1200000 },
      },
      {
        id: "3",
        day: 18,
        year: 2026,
        calendarDate: "Jan 18, 2026",
        relativeDate: "2 days ago",
        category: "stable",
        subcategory: "milestone",
        headline: "Blue Ridge Stable celebrates 50 wins",
        detail: "Trainer comments on landmark season.",
        meta: { stableName: "Blue Ridge Stable" },
      },
      {
        id: "4",
        day: 380,
        year: 2027,
        calendarDate: "Jan 16, 2027",
        relativeDate: "Today",
        category: "track",
        subcategory: "grade1",
        headline: "Affirmed captures Triple Crown",
        detail: "Heroic finish at Saratoga.",
        meta: { horseName: "Affirmed", trackName: "Saratoga" },
      },
    ];

    it("returns all items when category is 'all' and no query is set", () => {
      const filtered = filterAlmanacNewsFeed(sampleFeed, { category: "all" });
      expect(filtered).toHaveLength(4);
    });

    it("filters items by specific category", () => {
      const trackItems = filterAlmanacNewsFeed(sampleFeed, { category: "track" });
      expect(trackItems).toHaveLength(2);
      expect(trackItems.every((i) => i.category === "track")).toBe(true);

      const transferItems = filterAlmanacNewsFeed(sampleFeed, { category: "transfer" });
      expect(transferItems).toHaveLength(1);
      expect(transferItems[0].headline).toContain("Seattle Slew");

      const stableItems = filterAlmanacNewsFeed(sampleFeed, { category: "stable" });
      expect(stableItems).toHaveLength(1);
      expect(stableItems[0].headline).toContain("Blue Ridge Stable");
    });

    it("filters items by search query (headline, detail, and metadata)", () => {
      // Search in headline
      const byHorse = filterAlmanacNewsFeed(sampleFeed, {
        category: "all",
        searchQuery: "Secretariat",
      });
      expect(byHorse).toHaveLength(1);
      expect(byHorse[0].id).toBe("1");

      // Search in detail
      const byDetail = filterAlmanacNewsFeed(sampleFeed, {
        category: "all",
        searchQuery: "Keeneland",
      });
      expect(byDetail).toHaveLength(1);
      expect(byDetail[0].id).toBe("2");

      // Case insensitive
      const caseInsensitive = filterAlmanacNewsFeed(sampleFeed, {
        category: "all",
        searchQuery: "saratoga",
      });
      expect(caseInsensitive).toHaveLength(1);
      expect(caseInsensitive[0].id).toBe("4");
    });

    it("filters items by calendar year", () => {
      const year2027 = filterAlmanacNewsFeed(sampleFeed, {
        category: "all",
        year: 2027,
      });
      expect(year2027).toHaveLength(1);
      expect(year2027[0].year).toBe(2027);

      const year2026 = filterAlmanacNewsFeed(sampleFeed, {
        category: "all",
        year: 2026,
      });
      expect(year2026).toHaveLength(3);
    });

    it("combines category filter and search query", () => {
      const result = filterAlmanacNewsFeed(sampleFeed, {
        category: "track",
        searchQuery: "Belmont",
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");

      // Search matching something in transfer but category is track -> empty
      const emptyMatch = filterAlmanacNewsFeed(sampleFeed, {
        category: "track",
        searchQuery: "Keeneland",
      });
      expect(emptyMatch).toHaveLength(0);
    });
  });
});
