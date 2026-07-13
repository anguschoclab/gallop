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
    `Sensational Win for ${winner.name} in the ${race.name}!`,
    `${winner.name} Steals the Show in the ${race.name}.`,
    `Brilliant Run Sees ${winner.name} Take the ${race.name}.`,
    `The ${race.name} Belongs to ${winner.name}.`,
    `${winner.name} Triumphs in a Thrilling ${race.name}.`,
    `Unstoppable: ${winner.name} Captures the ${race.name}.`,
    `${winner.name} Crowned Champion of the ${race.name}.`,
    `No Catching ${winner.name} in the ${race.name}!`,
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
    `Delivering on all expectations, ${winner.name} unleashed a powerful stretch run to take home the prize in the ${race.name}.`,
    `It was a commanding performance from ${winner.name}, who dictated the pace and cruised to a memorable win in the ${race.name}.`,
    `Spectators were treated to an absolute clinic today as ${winner.name} completely outclassed the field to win the ${race.name}.`,
    `A tactical masterstroke paid off handsomely, allowing ${winner.name} to find daylight and spring an impressive upset in the ${race.name}.`,
    `${winner.name} confirmed their status as a rising star with a gutsy, hard-fought triumph in today's feature event, the ${race.name}.`,
    `Never in doubt from the start, ${winner.name} ran a picture-perfect race to emphatically capture the ${race.name}.`,
    `Showing tremendous heart and determination, ${winner.name} fended off all challengers in the closing stages of the ${race.name}.`,
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
    `Market Shock: ${horse.name} Commands $${formattedPrice}.`,
    `Blockbuster Deal! ${horse.name} Fetches $${formattedPrice}.`,
    `Massive Investment: ${horse.name} Acquired for $${formattedPrice}.`,
    `Bidding War Ends: ${horse.name} Goes for $${formattedPrice}.`,
    `${horse.name} Changes Hands in $${formattedPrice} Mega-Deal.`,
    `Headline Transaction: ${horse.name} Secured for $${formattedPrice}.`,
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
    `In a move that has the whole industry talking, ${horse.name} was acquired today. The new owners will be hoping for immediate returns on this massive investment.`,
    `Deep pockets were required to secure ${horse.name} today. Observers are eager to see how this high-profile acquisition reshapes the competitive landscape.`,
    `Following heated negotiations, ${horse.name} has officially joined a new stable. The staggering price tag brings with it sky-high expectations.`,
    `A jaw-dropping figure was finalized today for ${horse.name}. It's a bold statement of intent from the new ownership group.`,
    `The ink is dry on one of the season's biggest transactions. ${horse.name} is on the move, and the hefty price confirms their elite status.`,
    `Speculation finally ended today as ${horse.name} was sold. The immense valuation reflects the immense potential seen in this remarkable athlete.`,
    `It took a fortune, but a deal was struck for ${horse.name}. The pressure is now squarely on the new connections to make this massive investment pay off.`,
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
    {
      headline: "Jockey Colony Sees Influx of Talent",
      body: "A wave of promising apprentice riders has arrived on the circuit this week, eager to make their mark and challenge the established veterans.",
      category: "flavor" as NewsCategory,
    },
    {
      headline: "Historic Attendance Numbers Expected",
      body: "Ticket sales are surging ahead of the upcoming festival weekend, with organizers preparing for what could be a record-breaking crowd.",
      category: "flavor" as NewsCategory,
    },
    {
      headline: "Debate Over Artificial Surfaces Reignites",
      body: "A recent symposium on equine safety has once again sparked heated debates among trainers regarding the merits of synthetic racing surfaces.",
      category: "flavor" as NewsCategory,
    },
    {
      headline: "Equine Nutrition Seminar Draws Crowds",
      body: "Top veterinary experts gathered today to discuss the latest advancements in racing diets, emphasizing customized nutrition plans for peak performance.",
      category: "flavor" as NewsCategory,
    },
    {
      headline: "Track Management Promises Increased Purses",
      body: "Following a successful betting season, track administrators have committed to bumping up the purse structures for several upcoming mid-level allowance races.",
      category: "flavor" as NewsCategory,
    },
    {
      headline: "Charity Auction a Resounding Success",
      body: "The annual racing community charity gala raised unprecedented funds last night, with a silent auction featuring historic racing memorabilia.",
      category: "flavor" as NewsCategory,
    },
    {
      headline: "Heavy Rains Threaten Turf Schedule",
      body: "An unexpected storm system moving into the region has track superintendents working overtime to ensure the turf course remains safe for competition.",
      category: "flavor" as NewsCategory,
    },
    {
      headline: "Famed Announcer Announces Retirement",
      body: "After three decades of calling the races, the beloved voice of the local track has confirmed this season will be their last in the booth.",
      category: "flavor" as NewsCategory,
    },
    {
      headline: "New Quarantine Protocols Implemented",
      body: "In a proactive measure, racing authorities have introduced stricter travel guidelines for horses shipping in from out of state to ensure equine health.",
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
