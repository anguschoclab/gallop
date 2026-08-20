import { generateUUID } from "@/core/uuid";
import type { NewsItem, NewsCategory, NewsImportance } from "@/services/narrative/newsTypes";
import { ALL_FLAVOR_STORIES } from "@/services/narrative/flavorStories";
import type { Race, Horse } from "@/game/types";
import type { Rng } from "@/core/common/rng";
import {
  NEWS_HIGH_IMPORTANCE_PRICE_THRESHOLD,
  NEWS_LONG_DISTANCE_THRESHOLD,
  NEWS_SPRINT_DISTANCE_THRESHOLD,
  NEWS_DOMINANT_MARGIN_SECONDS,
  PHOTO_FINISH_THRESHOLD_SECONDS,
} from "@/constants";
export { generateG1SpotlightNews, generateFollowUpRaceNews } from "./newsSpotlight";

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
 * Adds conditional flavor text to headlines and bodies arrays based on race
 * conditions (weather, track condition, distance, winning margin).
 *
 * @param race - The completed race.
 * @param winner - The winning horse.
 * @param headlines - Array to push conditional headlines into.
 * @param bodies - Array to push conditional bodies into.
 */
function addConditionalRaceFlavor(
  race: Race,
  winner: Horse,
  headlines: string[],
  bodies: string[],
): void {
  if (race.weather === "rainy") {
    bodies.push(
      `Despite the pouring rain, ${winner.name} sloshed through the mud to claim a spectacular victory in the ${race.name}.`,
    );
    bodies.push(
      `The wet conditions couldn't slow down ${winner.name}, who splashed home to win the ${race.name}.`,
    );
  }

  if (race.trackCondition === "fast") {
    bodies.push(
      `Taking full advantage of the fast track, ${winner.name} flew down the stretch to capture the ${race.name}.`,
    );
  } else if (race.trackCondition === "heavy" || race.trackCondition === "soft") {
    bodies.push(
      `The tiring ${race.trackCondition} ground proved no issue for ${winner.name}, who showed immense stamina to win the ${race.name}.`,
    );
  }

  if (race.distance >= NEWS_LONG_DISTANCE_THRESHOLD) {
    bodies.push(
      `In a true test of stamina over ${race.distance}m, ${winner.name} outstayed the competition to win the ${race.name}.`,
    );
  } else if (race.distance <= NEWS_SPRINT_DISTANCE_THRESHOLD) {
    bodies.push(
      `Showing blinding speed in this ${race.distance}m sprint, ${winner.name} proved too quick for the field in the ${race.name}.`,
    );
  }

  if (race.result && race.result.length > 1) {
    const winnerRes = race.result.find((r) => r.position === 1);
    const secondRes = race.result.find((r) => r.position === 2);
    if (winnerRes && secondRes) {
      const margin = secondRes.time - winnerRes.time;
      if (margin > NEWS_DOMINANT_MARGIN_SECONDS) {
        headlines.push(`${winner.name} Destroys the Field in the ${race.name}!`);
        bodies.push(
          `It was an absolute romp! ${winner.name} destroyed the field by a massive margin to take the ${race.name}.`,
        );
        bodies.push(
          `Nobody else was even in the same zip code as ${winner.name} today. A truly dominant, wide-margin victory in the ${race.name}.`,
        );
      } else if (margin < PHOTO_FINISH_THRESHOLD_SECONDS) {
        headlines.push(`Nail-Biter: ${winner.name} Edges Out Rivals in the ${race.name}`);
        bodies.push(
          `In a thrilling photo finish, ${winner.name} just managed to stick their nose in front to steal the ${race.name}.`,
        );
        bodies.push(
          `Fans were on the edge of their seats as ${winner.name} narrowly held on in a desperately close finish to the ${race.name}.`,
        );
      }
    }
  }
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
    `A Flawless Victory for ${winner.name} in the ${race.name}.`,
    `${winner.name} Leaves Rivals Behind in ${race.name}.`,
    `The ${race.name} Crown Goes to ${winner.name}.`,
    `${winner.name} Stamps Authority on the ${race.name}.`,
    `A Deserved ${race.name} Win for ${winner.name}.`,
    `${winner.name} Too Strong for ${race.name} Field.`,
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
    `A magnificent run from ${winner.name} saw them claim the ${race.name} with plenty in reserve.`,
    `${winner.name} proved too classy for their rivals today, taking the ${race.name} with a devastating turn of foot.`,
    `The roar of the crowd accompanied ${winner.name} across the line to seal a memorable ${race.name} win.`,
    `Connections were thrilled as ${winner.name} executed a perfect race plan to win the ${race.name}.`,
    `Nobody could lay a glove on ${winner.name}, who romped home to win the ${race.name} in fine style.`,
    `A brilliant tactical ride allowed ${winner.name} to find the gaps and secure the ${race.name}.`,
    `${winner.name} made it look easy in the ${race.name}, pulling clear for an emphatic victory.`,
  ];

  addConditionalRaceFlavor(race, winner, headlines, bodies);

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
    `A King's Ransom: ${horse.name} Sold for $${formattedPrice}.`,
    `${horse.name} Smashes Expectations at $${formattedPrice}.`,
    `New Home for ${horse.name} After $${formattedPrice} Bid.`,
    `$${formattedPrice} Secures Top Talent ${horse.name}.`,
    `Market Frenzy Over $${formattedPrice} ${horse.name}.`,
    `${horse.name} Joins Elite Company at $${formattedPrice}.`,
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
    `A remarkable bidding war culminated in ${horse.name} changing hands for a massive sum, setting the tone for the season.`,
    `The sales ring erupted when the hammer finally fell on ${horse.name}, reflecting the massive potential of this athlete.`,
    `Expectations are soaring after ${horse.name} was acquired for an eye-watering figure today.`,
    `The new owners of ${horse.name} made a massive statement of intent, outbidding all rivals to secure the purchase.`,
    `It was standing room only as ${horse.name} entered the ring, eventually going to the highest bidder for a premium price.`,
  ];
  return createNewsItem(
    {
      day,
      category: "market",
      importance: price > NEWS_HIGH_IMPORTANCE_PRICE_THRESHOLD ? "high" : "medium",
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
  const story = rng.pick(ALL_FLAVOR_STORIES);

  return createNewsItem(
    {
      day,
      importance: "low",
      ...story,
    },
    rng,
  );
}

/* === generateG1SpotlightNews and generateFollowUpRaceNews extracted to newsSpotlight.ts === */

/**
 * Generates a weekly flavor news item that references world data.
 * Injects the top-earning horse's name into the body for world-awareness.
 *
 * @param {Horse[]} horses - All horses in the game world.
 * @param {number} day - Current simulation day.
 * @param {Rng} rng - Seeded random number generator.
 * @returns {NewsItem} A weekly flavor news item.
 */
export function generateWeeklyFlavorNews(horses: Horse[], day: number, rng: Rng): NewsItem {
  const topEarner =
    horses.length > 0
      ? [...horses].sort((a, b) => (b.lifetimeEarnings ?? 0) - (a.lifetimeEarnings ?? 0))[0]
      : null;

  const headlines = [
    `Week in Review: The State of Racing`,
    `Weekly Wrap: Talking Points from the Track`,
    `This Week in Racing: Stories and Speculation`,
    `The Weekly Digest: News from the Backstretch`,
    `Seven Days of Racing: What We Learned`,
    `Weekly Roundup: Horses, Handlers, and Headlines`,
    `The Track Beat: Weekly Racing Bulletin`,
    `From the Paddock: Weekly Racing Notes`,
    `The Week That Was: Highlights from the Circuit`,
    `Racing Review: This Week's Major Talking Points`,
    `Trackside Chatter: Weekly Racing News`,
    `The Monday Morning Gallop: Weekly Recap`,
    `Hoofbeats and Headlines: Weekly Review`,
    `The Racing Week: Winners, Losers, and News`,
  ];

  const bodiesWithHorse = topEarner
    ? [
        `It's been a busy week on the racing circuit, and ${topEarner.name} continues to lead the earnings charts with $${(topEarner.lifetimeEarnings ?? 0).toLocaleString()} in lifetime earnings. The question on everyone's mind: what's next for the season's top earner?`,
        `As the week wraps up, all eyes remain on ${topEarner.name}, whose career earnings of $${(topEarner.lifetimeEarnings ?? 0).toLocaleString()} place them at the top of the leaderboard. Connections are plotting their next move carefully.`,
        `The weekly wrap focuses on ${topEarner.name}, the sport's leading earner with $${(topEarner.lifetimeEarnings ?? 0).toLocaleString()} in the bank. Will we see them in action again soon, or is a well-earned rest on the cards?`,
        `Track insiders are buzzing about ${topEarner.name} this week. With $${(topEarner.lifetimeEarnings ?? 0).toLocaleString()} in career earnings, the pressure is on to maintain that winning momentum.`,
        `It was a quieter week on the racing front, but ${topEarner.name} remains the talk of the town. The leading earner with $${(topEarner.lifetimeEarnings ?? 0).toLocaleString()} is reportedly in fine form at home.`,
        `The backstretch chatter this week centered on ${topEarner.name}, whose $${(topEarner.lifetimeEarnings ?? 0).toLocaleString()} in earnings makes them the horse to beat. Pundits are already speculating about their next target.`,
        `As another week passes, ${topEarner.name} sits atop the earnings tree with $${(topEarner.lifetimeEarnings ?? 0).toLocaleString()}. The racing world waits with bated breath for their next appearance.`,
        `From morning workouts to evening gallops, the week belonged to ${topEarner.name} in the headlines. With $${(topEarner.lifetimeEarnings ?? 0).toLocaleString()} in career earnings, every move is scrutinized.`,
        `The racing world took a breath this week, but ${topEarner.name} remains the undisputed heavyweight with $${(topEarner.lifetimeEarnings ?? 0).toLocaleString()} earned. Every trainer is wondering how to beat them.`,
        `It was another week of speculation surrounding ${topEarner.name}. Boasting $${(topEarner.lifetimeEarnings ?? 0).toLocaleString()} in lifetime earnings, the superstar is the benchmark for success this season.`,
        `All conversations trackside eventually turn to ${topEarner.name}. The leading earner's $${(topEarner.lifetimeEarnings ?? 0).toLocaleString()} in career earnings is a testament to their dominance, and fans are eager for their next start.`,
        `While the week was light on major stakes action, ${topEarner.name} and their $${(topEarner.lifetimeEarnings ?? 0).toLocaleString()} in career earnings dominated the headlines. The sport is waiting to see where they will run next.`,
        `The week concludes with ${topEarner.name} firmly entrenched as the sport's top earner. With $${(topEarner.lifetimeEarnings ?? 0).toLocaleString()} to their name, the pressure to perform remains immense.`,
        `Whispers on the backstretch continue to focus on ${topEarner.name}. Having amassed $${(topEarner.lifetimeEarnings ?? 0).toLocaleString()} in earnings, the horse is setting the standard for greatness.`,
      ]
    : [];

  const genericBodies = [
    `It's been a quiet week on the racing front, with trainers using the lull to fine-tune their charges ahead of upcoming stakes engagements. The backstretch is humming with quiet anticipation.`,
    `A relatively uneventful week draws to a close, though seasoned observers know that calm before the storm often precedes the biggest racing days. Connections are biding their time.`,
    `The weekly roundup finds the racing world in a contemplative mood. With no major stakes contested, attention turns to morning works and the promise of future contests.`,
    `Another week in the books, and the racing community is already looking ahead. Trainers report good weather conditions and healthy strings as the season progresses.`,
    `It was a steady week on the circuit with little fanfare, but the groundwork being laid in morning workouts will soon pay dividends on race day.`,
    `The racing world caught its breath this week, with a lull in major action giving handlers a chance to assess their options and plan their next moves.`,
    `A peaceful week at the track, all things considered. The quiet routines of grooming, galloping, and grazing continue as the sport awaits its next big moment.`,
    `No fireworks this week, but the steady rhythm of the racing life carries on. The best is yet to come, and everyone on the backstretch knows it.`,
    `A relatively calm week of racing has come to an end. Stables are quietly preparing their contenders for the major battles that lie ahead on the calendar.`,
    `The week passed without major incident, allowing trainers to focus on the day-to-day grind. The calm atmosphere won't last long as the big race days approach.`,
    `It's been a week of maintenance and preparation on the backstretch. With no major upsets or controversies, the focus is squarely on the upcoming stakes schedule.`,
    `The racing circuit enjoyed a quiet week, a rare commodity in this sport. Connections are using the time to carefully plot their next moves on the chessboard.`,
    `A tranquil week at the track. The mornings have been crisp and the work steady, with trainers keeping their powder dry for the upcoming feature events.`,
    `No major headlines this week, just the steady rhythm of horses training and stables going about their business. The anticipation for the next big weekend is palpable.`,
  ];

  const bodies = topEarner ? bodiesWithHorse : genericBodies;

  return createNewsItem(
    {
      day,
      category: "flavor",
      importance: "low",
      headline: rng.pick(headlines),
      body: rng.pick(bodies),
    },
    rng,
  );
}
