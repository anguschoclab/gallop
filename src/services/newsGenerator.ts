import { generateUUID } from "@/core/uuid";
import type { NewsItem, NewsCategory, NewsImportance } from "@/core/narrative/newsTypes";
import type { Race, Horse } from "@/game/types";
import type { Rng } from "@/game/rng";

/**
 * Create a new NewsItem with a unique identifier.
 *
 * @param params - News item properties (excluding ID)
 * @param rng - Optional random number generator for deterministic ID
 * @returns Fully hydrated NewsItem object
 */
export function createNewsItem(params: Omit<NewsItem, "id">, rng?: Rng): NewsItem {
  return {
    id: generateUUID(rng),
    ...params,
  };
}

/**
 * Generate a news item summarizing a significant race result.
 *
 * Only generates news for high-stakes or graded races.
 *
 * @param race - The race that was run
 * @param result - Summary of the race result positions
 * @param horses - All horses in the race for name lookup
 * @param day - Current game day
 * @param rng - Seeded RNG for headline/body selection and ID
 * @returns NewsItem if significant, otherwise null
 */
export function generateRaceNews(
  race: Race,
  result: { horseId: string; position: number }[],
  horses: Horse[] | Map<string, Horse>,
  day: number,
  rng: Rng,
): NewsItem | null {
  const winnerEntry = result.find((r) => r.position === 1);
  if (!winnerEntry) return null;

  const winner =
    horses instanceof Map
      ? (horses as Map<string, Horse>).get(winnerEntry.horseId)
      : horses.find((h) => h.id === winnerEntry.horseId);
  if (!winner) return null;

  const grade = race.graded?.grade;
  const isHighImportance = grade === "G1" || grade === "G2";
  const isMediumImportance =
    grade === "G3" || race.raceClass === "Stakes" || race.raceClass === "Group";

  if (!isHighImportance && !isMediumImportance) return null;

  const importance: NewsImportance = isHighImportance ? "high" : "medium";
  const category: NewsCategory = "racing";

  const headlines = [
    `${winner.name} Dominates in ${race.name}!`,
    `Victory for ${winner.name} at ${race.name}.`,
    `${winner.name} Claims ${grade || race.raceClass} Glory.`,
    `A Masterclass from ${winner.name} in the ${race.name}.`,
  ];

  const bodies = [
    `The crowd was left breathless as ${winner.name} surged ahead to secure a stunning victory in the ${race.name}.`,
    `In a display of pure speed, ${winner.name} left the competition behind at ${race.name}, proving once again why they are a force to be reckoned with.`,
    `The ${race.name} provided the perfect stage for ${winner.name} to shine, crossing the finish line comfortably ahead of the field.`,
  ];

  const headline = rng.pick(headlines);
  const body = rng.pick(bodies);

  return createNewsItem({
    day,
    category,
    importance,
    headline,
    body,
    entityLinks: [
      { type: "horse", id: winner.id, name: winner.name },
      { type: "race", id: race.id, name: race.name },
    ],
  }, rng);
}

/**
 * Generate a news item for a high-value market transaction.
 *
 * @param horse - The horse that was sold
 * @param price - The final sale price
 * @param day - Current game day
 * @param rng - Seeded RNG for deterministic ID
 * @returns NewsItem summarizing the sale
 */
export function generateMarketNews(horse: Horse, price: number, day: number, rng: Rng): NewsItem {
  return createNewsItem({
    day,
    category: "market",
    importance: price > 500000 ? "high" : "medium",
    headline: `Record Sale: ${horse.name} Sold for $${price.toLocaleString()}!`,
    body: `The market was electric today as ${horse.name} changed hands for a staggering sum. Analysts suggest this could be a turning point for the buyer's stable.`,
    entityLinks: [{ type: "horse", id: horse.id, name: horse.name }],
  }, rng);
}

/**
 * Generate a random flavor news item for general atmosphere.
 *
 * @param day - Current game day
 * @param rng - Seeded RNG for story selection and ID
 * @returns Randomly selected flavor NewsItem
 */
export function generateFlavorNews(day: number, rng: Rng): NewsItem {
  const flavorStories = [
    {
      headline: "Local Track Upgrades Completed",
      body: "Track officials have announced the completion of several key infrastructure projects, promising a better experience for both fans and equine athletes.",
      category: "flavor" as NewsCategory,
    },
    {
      headline: "New Season Projections",
      body: "Pundits are already weighing in on the upcoming stakes schedule, with many predicting a highly competitive year for the 3-year-old division.",
      category: "flavor" as NewsCategory,
    },
    {
      headline: "Weather Alert: Clear Skies Ahead",
      body: "The regional meteorological bureau predicts ideal racing conditions for the next several days, with fast dirt and firm turf expected across most tracks.",
      category: "flavor" as NewsCategory,
    },
  ];

  const story = rng.pick(flavorStories);

  return createNewsItem({
    day,
    importance: "low",
    ...story,
  }, rng);
}

