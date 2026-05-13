/**
 * rivalryNewsGenerator.ts - Rivalry news generation
 *
 * This file provides functions to generate news items for rivalry milestones
 * including rivalry emergence, grudge matches, regional dominance changes,
 * and rivalry escalation events.
 *
 * Dependencies: @/core/narrative/newsTypes (NewsItem), @/core/narrative/newsTypes (createNewsItem), @/game/types (Horse, Race, Stable)
 * Related files: npc/npcCycle.ts (uses generator), SystemHandler.ts (applies news impacts)
 */

import { generateUUID } from "@/core/uuid";
import type { NewsItem, NewsCategory, NewsImportance } from "@/core/narrative/newsTypes";
import type { Horse, Race, Stable } from "@/game/types";

/**
 * Create a news item with a unique identifier.
 */
function createNewsItem(params: Omit<NewsItem, "id">): NewsItem {
  return {
    id: generateUUID(),
    ...params,
  };
}

/**
 * Generate news when a rivalry emerges (friction crosses 60 threshold).
 *
 * @param stable - The rival stable
 * @param friction - Current friction value
 * @param currentDay - Current game day
 * @returns NewsItem if rivalry emerges, otherwise null
 */
export function generateRivalryEmergenceNews(
  stable: Stable,
  friction: number,
  currentDay: number,
): NewsItem | null {
  if (friction < 60) return null;

  const headlines = [
    `Rivalry Emerges: Tensions Rise with ${stable.name}`,
    `${stable.name} Declares Rivalry`,
    `New Challenger: ${stable.name} Seeks Supremacy`,
  ];

  const bodies = [
    `The racing community is buzzing as ${stable.name} has emerged as a formidable rival. Sources close to the stable indicate they're prepared to do whatever it takes to claim victory.`,
    `A new chapter in racing rivalry has begun. ${stable.name} has made their intentions clear, and the competition is about to heat up.`,
    `Tensions are running high as ${stable.name} steps up to challenge for dominance. This rivalry is one to watch.`,
  ];

  const headline = headlines[Math.floor(Math.random() * headlines.length)];
  const body = bodies[Math.floor(Math.random() * bodies.length)];

  return createNewsItem({
    day: currentDay,
    category: "stable" as NewsCategory,
    importance: "high" as NewsImportance,
    headline,
    body,
    entityLinks: [{ type: "stable", id: stable.id, name: stable.name }],
  });
}

/**
 * Generate news for a grudge match result.
 *
 * @param race - The race that was run
 * @param playerHorse - The player's horse in the race
 * @param rivalHorse - The rival's horse in the race
 * @param playerWon - Whether the player won
 * @param currentDay - Current game day
 * @returns NewsItem summarizing the grudge match
 */
export function generateGrudgeMatchNews(
  race: Race,
  playerHorse: Horse,
  rivalHorse: Horse,
  playerWon: boolean,
  currentDay: number,
): NewsItem | null {
  const winner = playerWon ? playerHorse : rivalHorse;
  const loser = playerWon ? rivalHorse : playerHorse;

  const headlines = playerWon
    ? [
        `Grudge Match Victory: ${playerHorse.name} Bests ${rivalHorse.name}`,
        `${playerHorse.name} Claims Grudge Match Glory Over ${rivalHorse.name}`,
        `Statement Made: ${playerHorse.name} Defeats ${rivalHorse.name}`,
      ]
    : [
        `Grudge Match Defeat: ${rivalHorse.name} Tops ${playerHorse.name}`,
        `${rivalHorse.name} Prevails in Grudge Match Against ${playerHorse.name}`,
        `Bitter Loss: ${playerHorse.name} Falls to ${rivalHorse.name}`,
      ];

  const bodies = playerWon
    ? [
        `In a highly anticipated grudge match, ${playerHorse.name} delivered a stunning victory over ${rivalHorse.name}. The rivalry between these stables continues to intensify.`,
        `The racing world watched as ${playerHorse.name} outdueled ${rivalHorse.name} in a grudge match that will be talked about for weeks. This victory sends a clear message.`,
        `${playerHorse.name} proved superior in today's grudge match against ${rivalHorse.name}, adding another chapter to this heated rivalry.`,
      ]
    : [
        `In a stunning upset, ${rivalHorse.name} defeated ${playerHorse.name} in today's grudge match. The rivalry between these stables shows no sign of cooling down.`,
        `${rivalHorse.name} claimed victory over ${playerHorse.name} in a grudge match that has the racing community divided. The tension is palpable.`,
        `A bitter defeat for ${playerHorse.name} as ${rivalHorse.name} takes the grudge match. This rivalry is far from over.`,
      ];

  const headline = headlines[Math.floor(Math.random() * headlines.length)];
  const body = bodies[Math.floor(Math.random() * bodies.length)];

  return createNewsItem({
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
  });
}

/**
 * Generate news when the player loses regional dominance to a rival.
 *
 * @param region - The region being lost
 * @param rivalStable - The rival stable taking over
 * @param currentDay - Current game day
 * @returns NewsItem about the regional dominance change
 */
export function generateRegionLostNews(
  region: string,
  rivalStable: Stable,
  currentDay: number,
): NewsItem | null {
  const headlines = [
    `Regional King Dethroned in ${region}`,
    `${rivalStable.name} Seizes Control of ${region}`,
    `Power Shift: ${region} Under New Management`,
  ];

  const bodies = [
    `In a stunning development, ${rivalStable.name} has unseated the previous regional king in ${region}. The balance of power in the region has shifted dramatically.`,
    `${rivalStable.name} has emerged as the new dominant force in ${region}, ending the reign of the previous regional king. This marks a significant power shift.`,
    `The racing landscape in ${region} has changed as ${rivalStable.name} takes control as the new regional king. Competition in the region is about to intensify.`,
  ];

  const headline = headlines[Math.floor(Math.random() * headlines.length)];
  const body = bodies[Math.floor(Math.random() * bodies.length)];

  return createNewsItem({
    day: currentDay,
    category: "stable" as NewsCategory,
    importance: "high" as NewsImportance,
    headline,
    body,
    entityLinks: [
      { type: "stable", id: rivalStable.id, name: rivalStable.name },
    ],
  });
}

/**
 * Generate news when rivalry escalates to heated status (friction crosses 80).
 *
 * @param stable - The rival stable
 * @param oldFriction - Previous friction value
 * @param newFriction - New friction value
 * @param currentDay - Current game day
 * @returns NewsItem about rivalry escalation
 */
export function generateRivalryEscalationNews(
  stable: Stable,
  oldFriction: number,
  newFriction: number,
  currentDay: number,
): NewsItem | null {
  if (newFriction < 80 || oldFriction >= 80) return null;

  const headlines = [
    `Rivalry Escalates: Tensions Boil Over with ${stable.name}`,
    `Heated Rivalry: ${stable.name} Takes It to the Next Level`,
    `No Love Lost: ${stable.name} Intensifies Rivalry`,
  ];

  const bodies = [
    `The rivalry with ${stable.name} has escalated to dangerous levels. Both sides are digging in, and observers predict this will only get worse before it gets better.`,
    `What was once competitive rivalry has become heated. ${stable.name} has taken aggressive actions that have raised tensions significantly.`,
    `The situation with ${stable.name} has deteriorated. This is no longer friendly competition - this is a heated rivalry with real consequences.`,
  ];

  const headline = headlines[Math.floor(Math.random() * headlines.length)];
  const body = bodies[Math.floor(Math.random() * bodies.length)];

  return createNewsItem({
    day: currentDay,
    category: "stable" as NewsCategory,
    importance: "high" as NewsImportance,
    headline,
    body,
    entityLinks: [{ type: "stable", id: stable.id, name: stable.name }],
  });
}
