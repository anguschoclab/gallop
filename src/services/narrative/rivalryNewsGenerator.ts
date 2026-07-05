/**
 * rivalryNewsGenerator.ts - Deterministic news generation for stable rivalries.
 *
 * This service provides functions for generating news items related to
 * rivalry milestones, including emergence, escalation, grudge matches,
 * and regional dominance changes. All generation is seeded to ensure
 * simulation reproducibility.
 *
 * Dependencies: @/core/uuid, @/core/narrative/newsTypes, @/game/types, @/game/rng
 */
import { generateUUID } from "@/core/uuid";
import type { NewsItem, NewsCategory, NewsImportance } from "@/services/narrative/newsTypes";
import type { Horse, Race, Stable } from "@/game/types";
import type { Rng } from "@/core/common/rng";

/**
 * Create a news item with a unique identifier.
 *
 * @param params - The news item parameters excluding the ID
 * @param rng - Optional seeded RNG for deterministic ID generation
 * @returns A complete NewsItem with a unique ID
 */
function createNewsItem(params: Omit<NewsItem, "id">, rng?: Rng): NewsItem {
  return {
    id: generateUUID(rng),
    ...params,
  };
}

/**
 * Generate news when a rivalry emerges (friction crosses 60 threshold).
 *
 * @param stable - The rival stable that is emerging
 * @param friction - The current friction value being evaluated
 * @param currentDay - The current game day for the news timestamp
 * @param rng - Seeded RNG for deterministic flavor text selection and ID generation
 * @returns A NewsItem if the rivalry meets the threshold, otherwise null
 */
export function generateRivalryEmergenceNews(
  stable: Stable,
  friction: number,
  currentDay: number,
  rng: Rng,
): NewsItem | null {
  if (friction < 60) return null;

  const headlines = [
    `Rivalry Emerges: Tensions Rise with ${stable.name}`,
    `${stable.name} Declares Rivalry`,
    `New Challenger: ${stable.name} Seeks Supremacy`,
    `Lines Drawn: ${stable.name} Issues a Warning`,
    `${stable.name} Throws Down the Gauntlet`,
    `Brewing Storm: ${stable.name} Steps Up`,
  ];

  const bodies = [
    `The racing community is buzzing as ${stable.name} has emerged as a formidable rival. Sources close to the stable indicate they're prepared to do whatever it takes to claim victory.`,
    `A new chapter in racing rivalry has begun. ${stable.name} has made their intentions clear, and the competition is about to heat up.`,
    `Tensions are running high as ${stable.name} steps up to challenge for dominance. This rivalry is one to watch.`,
    `Whispers in the paddock have turned to outright declarations. ${stable.name} has set their sights on taking you down.`,
    `The gloves are off. ${stable.name} is making moves that suggest they see you as their primary obstacle to the top.`,
    `It's no longer just business for ${stable.name}. They're targeting your runners specifically, signaling the start of a bitter feud.`,
  ];

  const headline = rng.pick(headlines);
  const body = rng.pick(bodies);

  return createNewsItem(
    {
      day: currentDay,
      category: "stable" as NewsCategory,
      importance: "medium" as NewsImportance,
      headline,
      body,
      entityLinks: [{ type: "stable", id: stable.id, name: stable.name }],
    },
    rng,
  );
}

/**
 * Generate news for a grudge match result between the player and a rival.
 *
 * @param race - The race where the grudge match took place
 * @param playerHorse - The player's horse participating in the match
 * @param rivalHorse - The rival stable's horse participating in the match
 * @param playerWon - True if the player's horse finished ahead of the rival's horse
 * @param currentDay - The current game day for the news timestamp
 * @param rng - Seeded RNG for deterministic flavor text selection and ID generation
 * @param rivalStable - The rival stable involved in the confrontation
 * @returns A NewsItem summarizing the grudge match outcome, or null if generation fails
 */
export function generateGrudgeMatchNews(
  race: Race,
  playerHorse: Horse,
  rivalHorse: Horse,
  playerWon: boolean,
  currentDay: number,
  rng: Rng,
  rivalStable: Stable,
): NewsItem | null {
  const winner = playerWon ? playerHorse : rivalHorse;
  const loser = playerWon ? rivalHorse : playerHorse;

  const headlines = playerWon
    ? [
        `Grudge Match Victory: ${playerHorse.name} Bests ${rivalHorse.name}`,
        `${playerHorse.name} Claims Grudge Match Glory Over ${rivalHorse.name}`,
        `Statement Made: ${playerHorse.name} Defeats ${rivalHorse.name}`,
        `Bragging Rights: ${playerHorse.name} Conquers ${rivalHorse.name}`,
        `Rivalry Settled: ${playerHorse.name} Outruns ${rivalHorse.name}`,
        `${playerHorse.name} Silences Critics, Beats ${rivalHorse.name}`,
      ]
    : [
        `Grudge Match Defeat: ${rivalHorse.name} Tops ${playerHorse.name}`,
        `${rivalHorse.name} Prevails in Grudge Match Against ${playerHorse.name}`,
        `Bitter Loss: ${playerHorse.name} Falls to ${rivalHorse.name}`,
        `Rivalry Intensifies: ${rivalHorse.name} Beats ${playerHorse.name}`,
        `${rivalHorse.name} Takes the Spoils Against ${playerHorse.name}`,
        `Heartbreak: ${playerHorse.name} Edged Out by ${rivalHorse.name}`,
      ];

  const bodies = playerWon
    ? [
        `In a highly anticipated grudge match, ${playerHorse.name} delivered a stunning victory over ${rivalHorse.name}. The rivalry between these stables continues to intensify.`,
        `The racing world watched as ${playerHorse.name} outdueled ${rivalHorse.name} in a grudge match that will be talked about for weeks. This victory sends a clear message.`,
        `${playerHorse.name} proved superior in today's grudge match against ${rivalHorse.name}, adding another chapter to this heated rivalry.`,
        `There was no love lost as ${playerHorse.name} crossed the wire ahead of ${rivalHorse.name}, securing ultimate bragging rights for the stable.`,
        `The tension was electric, but ${playerHorse.name} held their nerve to deliver a crushing blow to ${rivalHorse.name} in today's bitter contest.`,
        `${playerHorse.name} didn't just win today; they made sure ${rivalHorse.name} saw them do it, further fueling the fire between these camps.`,
      ]
    : [
        `In a stunning upset, ${rivalHorse.name} defeated ${playerHorse.name} in today's grudge match. The rivalry between these stables shows no sign of cooling down.`,
        `${rivalHorse.name} claimed victory over ${playerHorse.name} in a grudge match that has the racing community divided. The tension is palpable.`,
        `A bitter defeat for ${playerHorse.name} as ${rivalHorse.name} takes the grudge match. This rivalry is far from over.`,
        `The hype was real, and unfortunately, ${rivalHorse.name} backed it up by leaving ${playerHorse.name} in their wake today.`,
        `It's a tough pill to swallow for the stable as ${rivalHorse.name} got the better of ${playerHorse.name} in a closely watched battle.`,
        `Tempers flared post-race after ${rivalHorse.name} managed to outclass ${playerHorse.name}, shifting the momentum squarely to the rival camp.`,
      ];

  const headline = rng.pick(headlines);
  const body = rng.pick(bodies);

  return createNewsItem(
    {
      day: currentDay,
      category: "racing" as NewsCategory,
      importance: "high" as NewsImportance,
      headline,
      body,
      entityLinks: [
        { type: "horse", id: winner.id, name: winner.name },
        { type: "horse", id: loser.id, name: loser.name },
        { type: "race", id: race.id, name: race.name },
        { type: "stable", id: rivalStable.id, name: rivalStable.name },
      ],
    },
    rng,
  );
}

/**
 * Generate news when the player loses regional dominance to a rival stable.
 *
 * @param region - The name of the region where power has shifted
 * @param rivalStable - The rival stable that has seized the regional crown
 * @param currentDay - The current game day for the news timestamp
 * @param rng - Seeded RNG for deterministic flavor text selection and ID generation
 * @returns A NewsItem detailing the shift in regional power
 */
export function generateRegionLostNews(
  region: string,
  rivalStable: Stable,
  currentDay: number,
  rng: Rng,
): NewsItem | null {
  const headlines = [
    `Regional King Dethroned in ${region}`,
    `${rivalStable.name} Seizes Control of ${region}`,
    `Power Shift: ${region} Under New Management`,
    `${region} Falls to ${rivalStable.name}`,
    `New Era in ${region}: ${rivalStable.name} Takes the Crown`,
    `${rivalStable.name} Claims the Throne in ${region}`,
  ];

  const bodies = [
    `In a stunning development, ${rivalStable.name} has unseated the previous regional king in ${region}. The balance of power in the region has shifted dramatically.`,
    `${rivalStable.name} has emerged as the new dominant force in ${region}, ending the reign of the previous regional king. This marks a significant power shift.`,
    `The racing landscape in ${region} has changed as ${rivalStable.name} takes control as the new regional king. Competition in the region is about to intensify.`,
    `Years of dominance have been upended as ${rivalStable.name} officially takes the reins in ${region}. Local syndicates are already rethinking their strategies.`,
    `The crown is heavy, but ${rivalStable.name} seems ready to wear it after forcefully seizing control of ${region}'s competitive circuit.`,
    `It's a tough day for the old guard. ${rivalStable.name} has marched into ${region} and completely rewritten the local hierarchy.`,
  ];

  const headline = rng.pick(headlines);
  const body = rng.pick(bodies);

  return createNewsItem(
    {
      day: currentDay,
      category: "stable" as NewsCategory,
      importance: "high" as NewsImportance,
      headline,
      body,
      entityLinks: [{ type: "stable", id: rivalStable.id, name: rivalStable.name }],
    },
    rng,
  );
}

/**
 * Generate news when rivalry escalates to heated status (friction crosses 80 threshold).
 *
 * @param stable - The rival stable involved in the escalation
 * @param oldFriction - The friction value prior to the latest increase
 * @param newFriction - The newly updated friction value
 * @param currentDay - The current game day for the news timestamp
 * @param rng - Seeded RNG for deterministic flavor text selection and ID generation
 * @returns A NewsItem if the escalation meets the threshold, otherwise null
 */
export function generateRivalryEscalationNews(
  stable: Stable,
  oldFriction: number,
  newFriction: number,
  currentDay: number,
  rng: Rng,
): NewsItem | null {
  if (newFriction < 80 || oldFriction >= 80) return null;

  const headlines = [
    `Rivalry Escalates: Tensions Boil Over with ${stable.name}`,
    `Heated Rivalry: ${stable.name} Takes It to the Next Level`,
    `No Love Lost: ${stable.name} Intensifies Rivalry`,
    `Boiling Point: The Feud with ${stable.name} Worsens`,
    `Hostilities Increase Between You and ${stable.name}`,
    `War of Words: ${stable.name} Escalates the Feud`,
  ];

  const bodies = [
    `The rivalry with ${stable.name} has escalated to dangerous levels. Both sides are digging in, and observers predict this will only get worse before it gets better.`,
    `What was once competitive rivalry has become heated. ${stable.name} has taken aggressive actions that have raised tensions significantly.`,
    `The situation with ${stable.name} has deteriorated. This is no longer friendly competition - this is a heated rivalry with real consequences.`,
    `Recent comments to the press from ${stable.name} have thrown gasoline on the fire. This feud is rapidly spiraling out of control.`,
    `It's getting personal. The actions of ${stable.name} have crossed a line, turning this sporting rivalry into a bitter, all-out war.`,
    `Trackside officials are reportedly monitoring the situation as animosity with ${stable.name} reaches an unprecedented high this week.`,
  ];

  const headline = rng.pick(headlines);
  const body = rng.pick(bodies);

  return createNewsItem(
    {
      day: currentDay,
      category: "stable" as NewsCategory,
      importance: "high" as NewsImportance,
      headline,
      body,
      entityLinks: [{ type: "stable", id: stable.id, name: stable.name }],
    },
    rng,
  );
}
