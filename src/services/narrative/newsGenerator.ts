import { generateUUID } from "@/core/uuid";
import type { NewsItem, NewsCategory, NewsImportance } from "@/services/narrative/newsTypes";
import type { Race, Horse } from "@/game/types";
import type { Rng } from "@/core/common/rng";

/**
 * Creates a new news item with a unique identifier.
 *
 * @param {Omit<NewsItem, "id">} params - The properties of the news item.
 * @param {Rng} [rng] - Optional seeded random number generator for deterministic ID creation.
 * @returns {NewsItem} A fully hydrated NewsItem object.
 */
export function createNewsItem(params: Omit<NewsItem, "id">, rng?: Rng): NewsItem {
  return {
    id: generateUUID(rng),
    ...params,
  };
}

/**
 * Generates a news item summarizing a significant race result.
 * Significant news is typically reserved for graded or high-stakes races.
 *
 * @param {Race} race - The race that was completed.
 * @param {Array<{horseId: string, position: number}>} result - Summary of the race finishing positions.
 * @param {Horse[] | Map<string, Horse>} horses - Collection of horses for looking up winner details.
 * @param {number} day - The current simulation day.
 * @param {Rng} rng - Seeded random number generator for headline/body randomization.
 * @returns {NewsItem | null} A news item if the race is deemed significant, otherwise null.
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
    `${winner.name} Claims ${grade || race.raceClass} Glory in ${race.name}.`,
    `A Masterclass from ${winner.name} in the ${race.name}.`,
  ];

  const bodies = [
    `The crowd was left breathless as ${winner.name} surged ahead to secure a stunning victory in the ${race.name}.`,
    `In a display of pure speed, ${winner.name} left the competition behind at ${race.name}, proving once again why they are a force to be reckoned with.`,
    `The ${race.name} provided the perfect stage for ${winner.name} to shine, crossing the finish line comfortably ahead of the field.`,
  ];

  const headline = rng.pick(headlines);
  const body = rng.pick(bodies);

  return createNewsItem(
    {
      day,
      category,
      importance,
      headline,
      body,
      entityLinks: [
        { type: "horse", id: winner.id, name: winner.name },
        { type: "race", id: race.id, name: race.name },
      ],
    },
    rng,
  );
}

/**
 * Generates a news item for a high-value horse transaction in the market.
 *
 * @param {Horse} horse - The horse that was sold.
 * @param {number} price - The final sale price.
 * @param {number} day - The current simulation day.
 * @param {Rng} rng - Seeded random number generator.
 * @returns {NewsItem} A news item summarizing the market transaction.
 */
export function generateMarketNews(horse: Horse, price: number, day: number, rng: Rng): NewsItem {
  return createNewsItem(
    {
      day,
      category: "market",
      importance: price > 500000 ? "high" : "medium",
      headline: `Record Sale: ${horse.name} Sold for $${price.toLocaleString()}!`,
      body: `The market was electric today as ${horse.name} changed hands for a staggering sum. Analysts suggest this could be a turning point for the buyer's stable.`,
      entityLinks: [{ type: "horse", id: horse.id, name: horse.name }],
    },
    rng,
  );
}

/**
 * Generates a random flavor news item to enhance the game world's atmosphere.
 *
 * @param {number} day - The current simulation day.
 * @param {Rng} rng - Seeded random number generator for story selection.
 * @returns {NewsItem} A randomly selected flavor news item.
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

  return createNewsItem(
    {
      day,
      importance: "low",
      ...story,
    },
    rng,
  );
}
