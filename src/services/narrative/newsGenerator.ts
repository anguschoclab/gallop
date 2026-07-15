import { generateUUID } from "@/core/uuid";
import { calculateOverallRating } from "@/core/horse/stats";
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

/**
 * Generates a spotlight news item when a horse with an overall rating of 90+
 * wins a Grade 1 race. The news highlights the horse's achievement and mentions
 * its overall rating.
 *
 * @param {Race} race - The completed G1 race.
 * @param {Array<{horseId: string, position: number}>} result - Race finishing positions.
 * @param {Horse[] | Map<string, Horse>} horses - Collection of horses for looking up winner.
 * @param {number} day - The current simulation day.
 * @param {Rng} rng - Seeded random number generator.
 * @returns {NewsItem | null} A spotlight news item if conditions are met, otherwise null.
 */
export function generateG1SpotlightNews(
  race: Race,
  result: { horseId: string; position: number }[],
  horses: Horse[] | Map<string, Horse>,
  day: number,
  rng: Rng,
): NewsItem | null {
  if (race.graded?.grade !== "G1") return null;

  const winnerEntry = result.find((r) => r.position === 1);
  if (!winnerEntry) return null;

  const winner =
    horses instanceof Map
      ? (horses as Map<string, Horse>).get(winnerEntry.horseId)
      : horses.find((h) => h.id === winnerEntry.horseId);
  if (!winner) return null;

  const overallRating = calculateOverallRating(winner);
  if (overallRating < 90) return null;

  const headlines = [
    `${winner.name} Proves Elite Status with ${overallRating}-Rated G1 Triumph`,
    `Rating ${overallRating}: ${winner.name} Dominates ${race.name}`,
    `${overallRating}-Rated ${winner.name} Captures G1 Glory in ${race.name}`,
    `Superstar Status: ${winner.name} (${overallRating} OVR) Wins ${race.name}`,
    `${winner.name} Lives Up to ${overallRating} Rating in ${race.name} Masterclass`,
    `Elite Company: ${winner.name} and His ${overallRating} Rating Shine in ${race.name}`,
    `No Doubts About ${overallRating}: ${winner.name} Delivers in ${race.name}`,
    `${winner.name} (${overallRating} OVR) Proves the Numbers Right in ${race.name}`,
    `Champion Calibre: ${winner.name} Brings ${overallRating} Rating to ${race.name} Victory`,
    `The ${overallRating}-Rated King: ${winner.name} Rules the ${race.name}`,
    `${winner.name} Shows Why the ${overallRating} Rating Fits in ${race.name}`,
    `G1 Glory for ${overallRating}-Rated Phenomenon ${winner.name}`,
  ];

  const bodies = [
    `With an overall rating of ${overallRating}, ${winner.name} proved exactly why they belong at the pinnacle of the sport, capturing the ${race.name} with authority and cementing their status as one of the game's true elite.`,
    `${winner.name} entered the ${race.name} carrying a lofty ${overallRating} overall rating — and left having justified every point of it with a breathtaking performance that left rivals in the dust.`,
    `It was a championship-calibre display from ${winner.name}, whose ${overallRating} overall rating marks them as a once-in-a-generation talent. The ${race.name} was their stage, and they owned every inch of it.`,
    `The ${overallRating}-rated ${winner.name} delivered a performance worthy of the number in the ${race.name}, proving that elite ratings are not just numbers but a reflection of true greatness on the track.`,
    `Few horses carry a ${overallRating} overall rating, and ${winner.name} showed exactly why they deserve it, sweeping aside the competition in the ${race.name} with a display of raw power and class.`,
    `${winner.name} and their ${overallRating} overall rating were the story of the ${race.name}, as the superstar left no doubt about who is the dominant force in Grade 1 racing right now.`,
    `A ${overallRating} overall rating doesn't come easy, and ${winner.name} made it look earned with a tour de force in the ${race.name} that will be replayed for years to come.`,
    `The numbers don't lie: ${winner.name} carries an ${overallRating} overall rating, and after that performance in the ${race.name}, nobody is questioning the math.`,
    `In a race full of champions, ${winner.name} stood apart — a horse whose ${overallRating} overall rating marks them as something special, and whose ${race.name} victory was a masterclass in every sense.`,
    `${winner.name} has long been regarded as one of the best, and their ${overallRating} overall rating was on full display in the ${race.name}, where they simply outclassed a field of elite contenders.`,
    `With the ${race.name} now in the books, ${winner.name} and that remarkable ${overallRating} overall rating will be the talk of the racing world for weeks. This is a horse at the absolute peak of their powers.`,
    `An ${overallRating} overall rating. A Grade 1 victory in the ${race.name}. ${winner.name} is not just living up to expectations — they're redefining them.`,
  ];

  const headline = rng.pick(headlines);
  const body = rng.pick(bodies);

  return createNewsItem(
    {
      day,
      category: "racing",
      importance: "high",
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
 * Generates a weekly flavor news item that references world data.
 * Injects the top-earning horse's name into the body for world-awareness.
 * @param horses
 * @param day
 * @param rng
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

/**
 * Generates a follow-up news item for a player-owned horse that finished
 * in the top 3 of a G1 or G2 race. The article discusses what might be next.
 * @param race
 * @param horse
 * @param position
 * @param day
 * @param rng
 */
export function generateFollowUpRaceNews(
  race: Race,
  horse: Horse,
  position: number,
  day: number,
  rng: Rng,
): NewsItem | null {
  const grade = race.graded?.grade;
  if (grade !== "G1" && grade !== "G2") return null;
  if (position < 1 || position > 3) return null;
  if (horse.stableId) return null;

  const positionLabel =
    position === 1 ? "victory" : position === 2 ? "runner-up finish" : "third-place finish";
  const positionLabelShort = position === 1 ? "win" : position === 2 ? "second" : "third";

  const headlines = [
    `What's Next for ${horse.name} After ${race.name}?`,
    `${horse.name} Shines in ${race.name} — Connections Plot Next Move`,
    `After ${race.name}: ${horse.name}'s Road Ahead`,
    `${horse.name} Impresses in ${race.name}, Eyes Bigger Prizes`,
    `The Future Looks Bright for ${horse.name} Post-${race.name}`,
    `${horse.name}'s ${race.name} Performance: Where to Now?`,
    `Post-${race.name} Plans for ${horse.name} Taking Shape`,
    `${horse.name} Turns Heads in ${race.name} — Next Target Awaited`,
  ];

  const bodies = [
    `Following a ${positionLabel} in the ${race.name} (${grade}), ${horse.name} has the racing world speculating about the next target. Connections are reportedly weighing several options for the horse's next start.`,
    `${horse.name}'s ${positionLabelShort} in the ${grade} ${race.name} has cemented their reputation as a top-class performer. The question now is whether to step up in distance, drop back, or tackle another grade-one contest.`,
    `The dust has barely settled on the ${race.name}, but ${horse.name}'s camp is already mapping out the next chapter. A ${positionLabel} in a ${grade} race opens plenty of doors for the rest of the season.`,
    `After a ${positionLabel} in the ${race.name}, ${horse.name} is firmly in the spotlight. Trainers are keeping their cards close to their chest, but the racing public is eager to see what comes next.`,
    `${horse.name} proved their mettle with a ${positionLabel} in the ${grade} ${race.name}. With confidence high, the team is considering all options — from a well-earned rest to another crack at top-level competition.`,
    `A ${positionLabel} in the ${race.name} (${grade}) has put ${horse.name} in the conversation for the season's remaining big prizes. The next entry decision could define the campaign.`,
    `The ${race.name} is in the books, and ${horse.name}'s ${positionLabel} has fans and pundits alike looking ahead. Will connections target another ${grade}, or test the waters at the highest level?`,
    `${horse.name} came away from the ${race.name} with a ${positionLabel}, and the racing world is watching closely. The horse's next start could be the defining moment of the season.`,
  ];

  return createNewsItem(
    {
      day,
      category: "racing",
      importance: "medium",
      headline: rng.pick(headlines),
      body: rng.pick(bodies),
      entityLinks: [
        { type: "horse", id: horse.id, name: horse.name },
        { type: "race", id: race.id, name: race.name },
      ],
    },
    rng,
  );
}
