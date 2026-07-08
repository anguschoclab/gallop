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
    `${winner.name} Too Good in the ${race.name}`,
    `Stunning Performance from ${winner.name} in ${race.name}`,
    `Unstoppable: ${winner.name} Takes the ${race.name}`,
    `${winner.name} Shines Brightest at ${race.name}`,
    `${race.name} Honors Go to ${winner.name}`,
    `${winner.name} Etches Name in ${race.name} History`,
    `Nothing Can Stop ${winner.name} in ${race.name}`,
    `A Race to Remember: ${winner.name} Wins ${race.name}`,
    `${winner.name} Wows the Crowd in ${race.name}`,
    `Flawless Run Secures ${race.name} for ${winner.name}`,
  ];

  const bodies = [
    `The crowd was left breathless as ${winner.name} surged ahead to secure a stunning victory in the ${race.name}.`,
    `In a display of pure speed, ${winner.name} left the competition behind at ${race.name}, proving once again why they are a force to be reckoned with.`,
    `The ${race.name} provided the perfect stage for ${winner.name} to shine, crossing the finish line comfortably ahead of the field.`,
    `Pundits were quick to praise ${winner.name} after a commanding run in today's ${race.name}, cementing their status as a top contender.`,
    `It was never in doubt. ${winner.name} took control of the ${race.name} and delivered a performance that will be talked about all season.`,
    `Connections of ${winner.name} were jubilant as their horse crossed the wire first in a fiercely contested ${race.name}.`,
    `A perfectly timed ride ensured ${winner.name} had plenty left in the tank to draw away from rivals in the late stages of the ${race.name}.`,
    `The stands erupted as ${winner.name} swept past the field to claim a well-deserved victory in the prestigious ${race.name}.`,
    `Other runners had no answers for the raw talent of ${winner.name}, who completely dictated the terms of the ${race.name}.`,
    `Expectations were high, and ${winner.name} more than delivered with a breathtaking stretch run to win the ${race.name}.`,
    `The victory in the ${race.name} adds another brilliant chapter to what is shaping up to be a remarkable career for ${winner.name}.`,
    `It was a tactical triumph as much as a physical one, with ${winner.name} finding the perfect trip to conquer the ${race.name}.`,
    `Bettors who backed ${winner.name} in the ${race.name} never had a moment of worry during a remarkably smooth trip to the winner's circle.`,
    `Few horses can do what ${winner.name} just did in the ${race.name}, leaving experts searching for new superlatives.`,
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
  const formattedPrice = price.toLocaleString();

  const headlines = [
    `Record Sale: ${horse.name} Sold for $${formattedPrice}!`,
    `Market Splash: ${horse.name} Fetches $${formattedPrice}`,
    `Big Money: ${horse.name} Changes Hands for $${formattedPrice}`,
    `${horse.name} Commands Massive $${formattedPrice} Price Tag`,
    `Auction Blockbuster: $${formattedPrice} for ${horse.name}`,
    `High Stakes: ${horse.name} Acquired for $${formattedPrice}`,
    `Wallet Emptied: $${formattedPrice} Spent on ${horse.name}`,
    `Market Moves: ${horse.name} Secures $${formattedPrice} Deal`,
    `The Price is Right: ${horse.name} Goes for $${formattedPrice}`,
    `Stunning Purchase: ${horse.name} Sells at $${formattedPrice}`,
  ];

  const bodies = [
    `The market was electric today as ${horse.name} changed hands for a staggering sum. Analysts suggest this could be a turning point for the buyer's stable.`,
    `A flurry of bidding concluded with ${horse.name} being sold for top dollar. The industry is buzzing with speculation on where the horse will run next.`,
    `It took a significant war chest to secure ${horse.name} today. Time will tell if the hefty investment pays off on the track.`,
    `The sales ring saw dramatic action as ${horse.name} was hammered down to the highest bidder. It's a massive statement of intent by the new owners.`,
    `Experts were stunned by the final price for ${horse.name}, proving that premium talent still commands a premium price in today's market.`,
    `The acquisition of ${horse.name} sends a clear signal to rival stables: the new connections are playing for keeps.`,
    `It was the talk of the auction grounds as ${horse.name} secured one of the highest prices we've seen in recent times.`,
    `Pockets were deep and bidding was fierce, but ultimately ${horse.name} found a new home. Expectations will be sky-high moving forward.`,
    `The hammer fell and the crowd gasped. The purchase of ${horse.name} is a high-risk, high-reward play that everyone will be watching.`,
    `With the sale of ${horse.name} now finalized, the pressure is immediately on the trainer to justify the breathtaking price tag.`,
  ];

  return createNewsItem(
    {
      day,
      category: "market",
      importance: price > 500000 ? "high" : "medium",
      headline: rng.pick(headlines),
      body: rng.pick(bodies),
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
    {
      headline: "Jockey Colony Sees Influx of Talent",
      body: "Several promising young riders have transferred their tack to the local circuit, raising the level of competition in the jockeys' room.",
      category: "flavor" as NewsCategory,
    },
    {
      headline: "Equine Nutrition Breakthrough",
      body: "Researchers at a leading veterinary college have published new findings on racehorse diets, prompting many top trainers to adjust their feed programs.",
      category: "flavor" as NewsCategory,
    },
    {
      headline: "Debate Over Whip Rules Continues",
      body: "The racing commission's latest meeting saw heated arguments regarding potential new restrictions on crop usage during the final furlong.",
      category: "flavor" as NewsCategory,
    },
    {
      headline: "Historical Sire Line Resurging",
      body: "Bloodstock analysts are noting an unexpected revival of a classic sire line that had seemingly fallen out of favor over the past decade.",
      category: "flavor" as NewsCategory,
    },
    {
      headline: "Track Attendance Figures Up",
      body: "A recent marketing push seems to be paying off, with weekend attendance numbers showing a healthy year-over-year increase across major venues.",
      category: "flavor" as NewsCategory,
    },
    {
      headline: "Trainer Milestone Approaching",
      body: "A veteran of the local training ranks is quietly approaching their 1000th career victory, drawing praise from peers across the backstretch.",
      category: "flavor" as NewsCategory,
    },
    {
      headline: "Turf Course Under Maintenance",
      body: "Groundskeepers are taking advantage of a brief gap in the schedule to aerate and re-seed sections of the turf course ahead of the major stakes weekend.",
      category: "flavor" as NewsCategory,
    },
    {
      headline: "New Syndicate Enters the Fray",
      body: "A deep-pocketed ownership group has officially registered their silks, signaling their intent to make a splash at the upcoming yearling sales.",
      category: "flavor" as NewsCategory,
    },
    {
      headline: "Veterinary Conference Concludes",
      body: "Leading equine practitioners wrapped up their annual summit today, highlighting new advancements in regenerative therapies for soft tissue injuries.",
      category: "flavor" as NewsCategory,
    },
    {
      headline: "Auction Catalog Drops",
      body: "The highly anticipated catalog for next month's premier sale has been released online, sending bloodstock agents scrambling to do their homework.",
      category: "flavor" as NewsCategory,
    },
    {
      headline: "Morning Line Oddsmaker Retires",
      body: "The track's long-time oddsmaker has announced their retirement after three decades of setting the morning lines for the local racing circuit.",
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
