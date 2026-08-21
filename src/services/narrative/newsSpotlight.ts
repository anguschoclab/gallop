import { calculateOverallRating } from "@/core/horse/stats";
import { createNewsItem } from "@/services/narrative/newsGenerator";
import type { NewsItem } from "@/services/narrative/newsTypes";
import type { Race, Horse } from "@/game/types";
import type { Rng } from "@/core/common/rng";
import { GRADE_S_THRESHOLD } from "@/constants";
import { isPlayerOwned } from "@/core/horse/ownership";

/**
 * Generates a spotlight news item when a horse with an overall rating of 90+
 * wins a Grade 1 race.
 *
 * @param race - The completed G1 race.
 * @param result - Race finishing positions.
 * @param horses - Collection of horses for looking up winner.
 * @param day - The current simulation day.
 * @param rng - Seeded random number generator.
 * @returns A spotlight news item if conditions are met, otherwise null.
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
  if (overallRating < GRADE_S_THRESHOLD) return null;

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
    `${winner.name} Stamps Class on the ${race.name} with ${overallRating} Rating`,
    `Unstoppable: ${overallRating}-Rated ${winner.name} Claims ${race.name}`,
    `The ${overallRating} OVR Juggernaut: ${winner.name} Wins ${race.name}`,
    `${race.name} Goes to ${overallRating}-Rated Phenomenon ${winner.name}`,
    `A True ${overallRating} Superstar: ${winner.name} Takes the ${race.name}`,
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
    `It takes a truly special animal to achieve a ${overallRating} overall rating, and ${winner.name} showed every ounce of that class in a breathtaking ${race.name} victory.`,
    `The buzz around ${winner.name}'s ${overallRating} overall rating was deafening before the ${race.name}, but the performance exceeded all expectations.`,
    `A ${overallRating} rating is rarefied air in this sport. ${winner.name} proved they belong among the all-time greats with a commanding run in the ${race.name}.`,
    `Trackside observers were left shaking their heads in disbelief as ${winner.name} (${overallRating} OVR) turned the prestigious ${race.name} into a one-horse exhibition.`,
    `You don't get a ${overallRating} overall rating by accident. ${winner.name} confirmed their elite status with a flawless, devastating victory in the ${race.name}.`,
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
 * Generates a follow-up news item for a player-owned horse that finished
 * in the top 3 of a G1 or G2 race.
 *
 * @param race - The completed G1 or G2 race.
 * @param horse - The player-owned horse that placed in the top 3.
 * @param position - Finishing position (1-3).
 * @param day - Current simulation day.
 * @param rng - Seeded random number generator.
 * @returns A follow-up news item, or null if conditions aren't met.
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
  if (!isPlayerOwned(horse)) return null;

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
    `Connections Ponder Next Target for ${horse.name}`,
    `Decisions Loom for ${horse.name} Following ${race.name}`,
    `All Eyes on ${horse.name}'s Next Entry After ${race.name}`,
    `${horse.name} Exits ${race.name} in Top Form, What's Next?`,
    `The Racing World Awaits ${horse.name}'s Next Move`,
    `Plotting the Course for ${horse.name} Post-${race.name}`,
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
    `With a hard-fought ${positionLabel} in the ${race.name} behind them, the team surrounding ${horse.name} is meticulously plotting their next move. Expect a carefully considered entry for their upcoming start.`,
    `${horse.name} emerged from the ${grade} ${race.name} with enormous credit after a gallant ${positionLabel}. Trackside rumors suggest several high-profile targets are currently under discussion.`,
    `The racing calendar offers plenty of tempting options for ${horse.name} following a solid ${positionLabel} in the ${race.name}. Connections will be weighing distance and surface before committing.`,
    `A stellar performance to secure a ${positionLabel} in the ${race.name} has ${horse.name} perfectly positioned for a late-season push. The trainer's next move will be analyzed by racing pundits everywhere.`,
    `Having proven their class with a ${positionLabel} in the ${race.name} (${grade}), ${horse.name} now faces the enviable problem of having multiple prestigious races to choose from.`,
    `The immediate aftermath of the ${race.name} has left connections of ${horse.name} thrilled with their ${positionLabelShort}. Now, the strategic challenge begins as they map out the optimal path forward.`,
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
