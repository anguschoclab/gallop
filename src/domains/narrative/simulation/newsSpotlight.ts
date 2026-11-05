import { calculateOverallRating } from "@/domains/horse/simulation/stats";
import { createNewsItem } from "@/domains/narrative/simulation/newsGenerator";
import type { NewsItem } from "@/domains/narrative/model/newsTypes";
import type { Race, Horse } from "@/platform/game/types";
import type { Rng } from "@/shared/common/rng";
import { GRADE_S_THRESHOLD } from "@/domains/horse/model/horseStatConstants";
import { isPlayerOwned } from "@/domains/horse/simulation/ownership";

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
    `No Match for ${winner.name}: ${overallRating}-Rated Star Takes ${race.name}`,
    `Simply the Best: ${overallRating}-Rated ${winner.name} Wins ${race.name}`,
    `${winner.name} Shines Brightest in ${race.name} with ${overallRating} Rating`,
    `The Class of the Field: ${winner.name} (${overallRating} OVR) Wins ${race.name}`,
    `${race.name} Belongs to ${overallRating}-Rated ${winner.name}`,
    `A Masterclass in ${race.name} from ${overallRating}-Rated ${winner.name}`,
    `${winner.name} Brings ${overallRating} Rating and Takes Home ${race.name}`,
    `Excellence on Display: ${overallRating}-Rated ${winner.name} Dominates ${race.name}`,
    `${race.name} Victory for ${overallRating} OVR Phenomenon ${winner.name}`,
    `The ${overallRating} Rating is Real: ${winner.name} Triumphs in ${race.name}`,
    `In a League of Their Own: ${overallRating}-Rated ${winner.name} Wins ${race.name}`,
    `${winner.name} Proves ${overallRating} Rating in Historic ${race.name} Win`,
    `Elite Performance: ${overallRating}-Rated ${winner.name} Secures ${race.name}`,
    `${race.name} Conquered by ${overallRating}-Rated ${winner.name}`,
    `The Hype is Justified: ${winner.name} (${overallRating} OVR) Wins ${race.name}`,
    `Another One for the Resume: ${overallRating}-Rated ${winner.name} Takes ${race.name}`,
    `${winner.name} Puts ${overallRating} Rating to Work in ${race.name} Victory`,
    `A Flawless Display by ${overallRating}-Rated ${winner.name} in ${race.name}`,
    `The Crown Jewel: ${winner.name} (${overallRating} OVR) Wins ${race.name}`,
    `Unrivaled Greatness: ${overallRating}-Rated ${winner.name} Dominates ${race.name}`,
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
    `When a horse carrying a ${overallRating} overall rating enters the ${race.name}, expectations are sky-high. ${winner.name} met them all and then some.`,
    `The history books will remember ${winner.name} for this ${race.name} victory, a performance that perfectly encapsulated their ${overallRating} overall rating.`,
    `It was a privilege to watch ${winner.name} in the ${race.name}. A ${overallRating} overall rating doesn't fully capture the magic we saw on the track.`,
    `Rivals had no answer for ${winner.name} in the ${race.name}. Their ${overallRating} overall rating was evident in every powerful stride.`,
    `The ${race.name} has crowned many champions, but few as dominant as ${winner.name}, who justified their ${overallRating} overall rating in spectacular fashion.`,
    `A true champion shines when the lights are brightest. ${winner.name} and their ${overallRating} overall rating stole the show in the ${race.name}.`,
    `The coronation is complete. ${winner.name} is the undisputed king after a ${race.name} victory that underscored their immense ${overallRating} overall rating.`,
    `A breathtaking display of speed and stamina. ${winner.name} proved why they are rated at ${overallRating} overall with a sensational win in the ${race.name}.`,
    `The ${race.name} was expected to be a test, but ${winner.name} (${overallRating} OVR) turned it into a showcase of unparalleled ability.`,
    `Generational talent was on display in the ${race.name} as ${winner.name} lived up to their incredible ${overallRating} overall rating.`,
    `The crowd roared as ${winner.name} crossed the wire in the ${race.name}, cementing a legacy built on a staggering ${overallRating} overall rating.`,
    `Perfection is hard to achieve, but ${winner.name}'s performance in the ${race.name} came close, validating their massive ${overallRating} overall rating.`,
    `It was never really in doubt. ${winner.name} controlled the ${race.name} from start to finish, a performance worthy of a ${overallRating} overall rating.`,
    `The sporting world watched in awe as ${winner.name} (${overallRating} OVR) dismantled a stellar field in the ${race.name}.`,
    `A victory for the ages. ${winner.name} used their ${overallRating} overall rating to full effect, securing a legendary win in the ${race.name}.`,
    `There are good horses, and then there are greats. ${winner.name} proved they belong in the latter category with a ${overallRating}-rated performance in the ${race.name}.`,
    `The ${race.name} will go down as the defining moment for ${winner.name}, a race where their ${overallRating} overall rating translated into pure dominance.`,
    `No excuses, no doubts. ${winner.name} and their ${overallRating} overall rating stood alone at the summit following the ${race.name}.`,
    `A magnificent performance from start to finish. ${winner.name} proved their ${overallRating} overall rating is well-deserved with a resounding victory in the ${race.name}.`,
    `The ${race.name} was supposed to be a challenge, but ${winner.name} made it look easy, showcasing the incredible talent behind their ${overallRating} overall rating.`,
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
    `The Aftermath of the ${race.name}: ${horse.name}'s Path Forward`,
    `Where Does ${horse.name} Go from the ${race.name}?`,
    `Next Steps for ${horse.name} After Strong ${race.name} Showing`,
    `Connections Weigh Options for ${horse.name} Following ${race.name}`,
    `${horse.name} Exits the ${race.name} with Plenty of Options`,
    `Targeting the Next Big One: ${horse.name} After the ${race.name}`,
    `Future Targets Discussed for ${horse.name} Post-${race.name}`,
    `${horse.name} Steps Up in ${race.name}, Future Looks Bright`,
    `Connections of ${horse.name} Evaluate Next Steps After ${race.name}`,
    `Where Will ${horse.name} Run Next Following the ${race.name}?`,
    `Strategic Options Abound for ${horse.name} After ${race.name}`,
    `The ${race.name} Performance Opens New Doors for ${horse.name}`,
    `Looking Ahead: ${horse.name} Gathers Momentum After ${race.name}`,
    `Next Steps for ${horse.name} Following ${race.name} Display`,
    `The Route Forward for ${horse.name} Post-${race.name}`,
    `${horse.name} Shows Class in ${race.name}, Connections Consider Options`,
    `Mapping the Season for ${horse.name} After Strong ${race.name} Showing`,
    `Anticipation Builds for ${horse.name}'s Next Start Post-${race.name}`,
    `${horse.name}'s Connections Face Pleasant Dilemma After ${race.name}`,
    `Speculation Mounts Over ${horse.name}'s Next Outing`,
    `${horse.name} Leaves Lasting Impression in ${race.name}`,
    `${race.name} Form Points to Big Future for ${horse.name}`,
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
    `The ${positionLabel} secured by ${horse.name} in the ${grade} ${race.name} has opened up a world of possibilities. Connections are taking their time to find the perfect follow-up engagement.`,
    `A tremendous display resulting in a ${positionLabel} in the ${race.name} has ${horse.name} in peak form. The trainer is currently evaluating the stakes calendar to pick their next battleground.`,
    `Following a bold showing in the ${race.name} for a ${positionLabel}, ${horse.name} is the talk of the track. Fans are eagerly refreshing the entry sheets to see where this talented runner turns up next.`,
    `With a hard-earned ${positionLabel} in the ${race.name} (${grade}) on their resume, ${horse.name} has proven they belong in elite company. The stable is reportedly weighing up several high-profile targets.`,
    `The ${race.name} was a serious test, and ${horse.name} passed with flying colors to secure a ${positionLabel}. Track whispers suggest an ambitious target is being lined up for their next start.`,
    `It was a performance full of promise in the ${race.name}, as ${horse.name} secured a ${positionLabel}. The connections are holding all the cards as they decide on the best path forward for the rest of the campaign.`,
    `A powerful showing to earn a ${positionLabel} in the ${race.name} ensures ${horse.name} remains a major talking point. Pundits anticipate their next run will be highly anticipated.`,
    `Securing a ${positionLabel} in a demanding test like the ${race.name} proves ${horse.name} is a force to be reckoned with. The stable must now decide where to deploy their star next.`,
    `There was much to admire in ${horse.name}'s display at the ${race.name}, resulting in a well-deserved ${positionLabel}. Track insiders suggest a step up in distance could be on the horizon.`,
    `Delivering a gutsy performance in the ${grade} ${race.name}, ${horse.name} secured a ${positionLabel} and has everyone guessing what their autumn target might be.`,
    `The sheer class shown by ${horse.name} to grab a ${positionLabel} in the ${race.name} has opened up a wealth of options. Connections have the luxury of picking their next prestigious engagement.`,
    `Fans were treated to a brilliant showing from ${horse.name} in the ${race.name}, walking away with a ${positionLabel}. The upcoming entry book will be heavily scrutinized by the racing press.`,
    `It was a statement performance by ${horse.name} in the ${race.name}. The industry waits to see if they will be aimed at an even tougher test next time out following their ${positionLabel}.`,
    `Following a determined ${positionLabel} in the ${race.name}, ${horse.name} has proven their resilience. The stable is expected to make an announcement regarding their next race soon.`,
    `Building on a promising ${positionLabel} in the ${race.name}, the camp around ${horse.name} has reason for quiet optimism as they search the stakes calendar for their next appearance.`,
    `The ${positionLabelShort} achieved by ${horse.name} in the ${race.name} (${grade}) proved they belong among the elite. Handlers must now carefully select the right spot to capitalize on this glowing form.`,
    `Supporters of ${horse.name} were delighted with the ${positionLabel} produced in the ${race.name}. With form peaking, the stable's brains trust is deep in discussion regarding upcoming race targets.`,
    `It was a statement display from ${horse.name} to earn a ${positionLabel} in the highly competitive ${race.name}. Fans are clamoring to know when this talented runner will next grace the track.`,
    `A resilient showing in the ${race.name} yielded a well-deserved ${positionLabel} for ${horse.name}. Connections are evaluating all avenues as they aim to build upon this momentum in the coming weeks.`,
    `Securing a ${positionLabel} in a race as demanding as the ${grade} ${race.name} is no small feat. The narrative around ${horse.name} is rapidly building, with everyone keen to see their next entry.`,
    `The post-race assessment of ${horse.name}'s ${positionLabel} in the ${race.name} has been overwhelmingly positive. The strategic direction for the remainder of their campaign is now the primary focus.`,
    `Riding high after a commendable ${positionLabel} in the ${race.name}, ${horse.name} presents a thrilling prospect for the rest of the year. The trainer's entry placement will be eagerly anticipated.`,
    `The impressive showing by ${horse.name} in the ${race.name} guarantees they will be a horse to follow wherever they appear next. The ${positionLabel} proved their class in ${grade} company.`,
    `Talk on the backstretch has firmly centered on ${horse.name} since their bold ${positionLabelShort} in the ${race.name}. Planners are undoubtedly scouring the condition book for the perfect follow-up.`,
    `A taxing ${positionLabel} in the ${race.name} means ${horse.name} might need time to freshen up, though their connections will be ecstatic with the ${grade} performance.`,
    `After confirming their talent with a ${positionLabel} in the ${race.name}, ${horse.name} has options aplenty. Stepping up to the plate again in ${grade} grade seems a certainty.`,
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
