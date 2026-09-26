/**
 * narrative/directiveNewsGenerator.ts - Generate news items for strategic directive changes
 *
 * When an NPC stable's top strategic directive shifts (e.g., from racing_focus
 * to financial_distress), this generates a news item to surface the change to the player.
 */

import type { StrategicDirective, DirectiveType } from "@/core/ai/strategicCoordinator";
import type { NewsItem, NewsImportance, EntityLink } from "@/core/narrative/newsTypes";
import { createRng, hashStr } from "@/core/common/rng";
import { generateUUID } from "@/core/uuid";

const DIRECTIVE_LABELS: Record<DirectiveType, string> = {
  aggressive_expansion: "Aggressive Expansion",
  expansion: "Expansion",
  defensive: "Defensive Posture",
  cost_cutting: "Cost Cutting",
  breeding_expansion: "Breeding Expansion",
  breeding_focus: "Breeding Focus",
  racing_focus: "Racing Focus",
  market_speculation: "Market Speculation",
  consolidation: "Consolidation",
  financial_distress: "Financial Distress",
};

const DIRECTIVE_DESCRIPTIONS: Record<DirectiveType, string> = {
  aggressive_expansion: "doubling down on aggressive expansion across multiple fronts",
  expansion: "shifting toward broader expansion strategies",
  defensive: "retrenching into a defensive posture",
  cost_cutting: "implementing aggressive cost-cutting measures",
  breeding_expansion: "pivoting toward breeding expansion",
  breeding_focus: "narrowing focus to breeding operations",
  racing_focus: "zeroing in on racing performance",
  market_speculation: "betting big on market speculation",
  consolidation: "consolidating resources and holdings",
  financial_distress: "facing mounting financial difficulties",
};

/**
 * Get the highest-priority directive from a list.
 * @param directives - Array of strategic directives
 * @returns The highest-priority directive, or null if empty
 */
function getTopDirective(directives: StrategicDirective[]): StrategicDirective | null {
  if (directives.length === 0) return null;
  return [...directives].sort((a, b) => a.priority - b.priority)[0];
}

/**
 * Generate a news item when a stable's top strategic directive changes.
 * @param stable - The NPC stable
 * @param stable.id
 * @param stable.name
 * @param stable.personality
 * @param oldDirectives - Previous strategic directives
 * @param newDirectives - New strategic directives
 * @param currentDay - Current game day
 * @returns News item if top directive changed, null otherwise
 */
export function generateDirectiveChangeNews(
  stable: { id: string; name: string; personality: string },
  oldDirectives: StrategicDirective[] | null | undefined,
  newDirectives: StrategicDirective[],
  currentDay: number,
): NewsItem | null {
  if (!oldDirectives || oldDirectives.length === 0) return null;

  const oldTop = getTopDirective(oldDirectives);
  const newTop = getTopDirective(newDirectives);

  if (!oldTop || !newTop) return null;
  if (oldTop.type === newTop.type) return null;

  const isDistressShift = newTop.type === "financial_distress";
  const importance: NewsImportance = isDistressShift ? "high" : "medium";

  const oldLabel = DIRECTIVE_LABELS[oldTop.type];
  const newLabel = DIRECTIVE_LABELS[newTop.type];
  const description = DIRECTIVE_DESCRIPTIONS[newTop.type];

  const rng = createRng(hashStr(`directive-${stable.id}-${currentDay}`));

  const entityLinks: EntityLink[] = [{ type: "stable", id: stable.id, name: stable.name }];

  const headlines = isDistressShift
    ? [
        `Trouble at ${stable.name}: Financial Distress`,
        `${stable.name} Faces Financial Difficulties`,
        `Mounting Debts: ${stable.name} in Distress`,
        `Financial Woes Hit ${stable.name}`,
        `Alarm Bells Ringing for ${stable.name}`,
        `Economic Crisis at ${stable.name}`,
        `${stable.name} Forced into Financial Distress`,
        `Budget Shortfalls Threaten ${stable.name}`,
        `Breaking Point: ${stable.name} Runs Out of Runway`,
        `${stable.name} Operations in Jeopardy`,
        `A Harsh Reality for ${stable.name}`,
        `Cash Flow Crisis Rocks ${stable.name}`,
        `${stable.name} Sounds the Alarm on Finances`,
        `Red Ink: ${stable.name} Reaches Critical Phase`,
        `The Bill Comes Due for ${stable.name}`,
        `Desperate Times: ${stable.name} in Trouble`,
      ]
    : [
        `${stable.name} Shifts Strategy: ${newLabel}`,
        `New Direction for ${stable.name}: ${newLabel}`,
        `${stable.name} Pivots to ${newLabel}`,
        `Strategic Realignment at ${stable.name}`,
        `${stable.name} Abandons ${oldLabel} for ${newLabel}`,
        `Inside the Reorganization at ${stable.name}`,
        `A Change of Course: ${stable.name} Eyes ${newLabel}`,
        `${stable.name} Management Announces ${newLabel}`,
        `Breaking Ground: ${stable.name} Goes All In on ${newLabel}`,
        `${stable.name} Rewrites the Playbook with ${newLabel}`,
        `The Next Chapter: ${stable.name} Embraces ${newLabel}`,
        `Rivals Notice as ${stable.name} Switches to ${newLabel}`,
        `A New Era: ${stable.name} Sets Sights on ${newLabel}`,
        `${stable.name} Restructures Ahead of the Season`,
        `Philosophy Change at ${stable.name}: Welcome to ${newLabel}`,
        `Looking Ahead: ${stable.name} Transitions to ${newLabel}`,
      ];

  const bodies = isDistressShift
    ? [
        `${stable.name} has abandoned their ${oldLabel.toLowerCase()} approach and is now ${description}. The stable's racing operations may face severe cuts.`,
        `Rumors of cash flow issues at ${stable.name} have been confirmed. Moving away from ${oldLabel.toLowerCase()}, they are now ${description}.`,
        `It's a tough time for ${stable.name}. Their previous focus on ${oldLabel.toLowerCase()} has crumbled, and the operation is currently ${description}.`,
        `The financial reality has caught up with ${stable.name}. Forced to scrap their ${oldLabel.toLowerCase()} strategy, the stable is ${description}.`,
        `Insiders report that ${stable.name} is in crisis management mode. No longer pursuing ${oldLabel.toLowerCase()}, they are instead ${description}.`,
        `The money has dried up at ${stable.name}. Management is stepping away from ${oldLabel.toLowerCase()} as the stable is ${description}.`,
        `Things are looking bleak for ${stable.name}, who are ${description} after their ${oldLabel.toLowerCase()} plans failed to pan out.`,
        `${stable.name} is pulling the emergency brake. Shedding their ${oldLabel.toLowerCase()} directives, the operation is simply ${description}.`,
        `Creditors are circling as ${stable.name} abruptly ends their ${oldLabel.toLowerCase()} campaign. The front office is now entirely consumed by ${description}.`,
        `A dire warning was issued to stakeholders today. ${stable.name} has officially halted their ${oldLabel.toLowerCase()} ambitions and is heavily ${description}.`,
        `It has been a spectacular fall from grace. By stepping back from ${oldLabel.toLowerCase()} and ${description}, ${stable.name} is fighting for sheer survival.`,
        `Empty stalls and quiet barns speak volumes at ${stable.name}. The bold ${oldLabel.toLowerCase()} strategy is dead, replaced by the grim reality of ${description}.`,
        `It's a fire sale mentality over at ${stable.name}. Any remaining pretense of ${oldLabel.toLowerCase()} has vanished while the organization is ${description}.`,
        `With mounting debts making their prior ${oldLabel.toLowerCase()} focus impossible to sustain, ${stable.name} finds itself ${description}.`,
        `The books don't lie. ${stable.name} is hemorrhaging capital, ditching their ${oldLabel.toLowerCase()} playbook entirely and aggressively ${description}.`,
        `Racing takes a back seat when the lights might go out. ${stable.name} has shuttered their ${oldLabel.toLowerCase()} initiative and is desperately ${description}.`,
      ]
    : [
        `${stable.name} has pivoted from ${oldLabel.toLowerCase()} to ${newLabel.toLowerCase()}, ${description}. The stable's racing operations may be affected by this strategic realignment.`,
        `In a major strategic shift, ${stable.name} is leaving behind its ${oldLabel.toLowerCase()} approach. Insiders confirm they are now ${description}, which is expected to shape their immediate plans.`,
        `Sources close to ${stable.name} report a change in philosophy. The operation is moving away from ${oldLabel.toLowerCase()} and is instead ${description}.`,
        `The era of ${oldLabel.toLowerCase()} at ${stable.name} appears to be over. Management has directed a new focus on ${newLabel.toLowerCase()}, ${description}.`,
        `${stable.name} is restructuring its priorities. Abandoning their recent ${oldLabel.toLowerCase()} focus, the stable is now ${description}.`,
        `Competitors take note: ${stable.name} has officially changed tactics. By stepping away from ${oldLabel.toLowerCase()} and ${description}, the stable is charting a new course.`,
        `A noticeable shift is underway at ${stable.name}. The focus on ${oldLabel.toLowerCase()} has been replaced by ${newLabel.toLowerCase()}, with the team now ${description}.`,
        `Following internal reviews, ${stable.name} is taking a new path. They are ${description}, leaving their previous ${oldLabel.toLowerCase()} strategy in the rearview mirror.`,
        `The whiteboard in the front office at ${stable.name} has been wiped clean. Moving on from ${oldLabel.toLowerCase()}, the brain trust is visibly ${description}.`,
        `Every stable must evolve, and ${stable.name} has chosen to do so by pivoting away from ${oldLabel.toLowerCase()}. The new directive involves ${description}.`,
        `A memo went out to all staff at ${stable.name} this morning detailing a pivot away from ${oldLabel.toLowerCase()}. The operation is now completely ${description}.`,
        `It's out with the old and in with the new. ${stable.name} has formally scrapped their ${oldLabel.toLowerCase()} goals, redirecting their resources toward ${description}.`,
        `Market observers weren't entirely surprised when ${stable.name} dropped their ${oldLabel.toLowerCase()} campaign to try ${description}. It represents a bold new chapter.`,
        `The ownership group at ${stable.name} has demanded a change of pace. Stepping back from ${oldLabel.toLowerCase()}, the yard will focus its energy on ${description}.`,
        `It seems the ${oldLabel.toLowerCase()} experiment is finally over at ${stable.name}. Moving forward, the stated mandate is ${description}.`,
        `Whispers on the backside became official news today. ${stable.name} is moving past their ${oldLabel.toLowerCase()} strategy and aggressively ${description}.`,
      ];

  return {
    id: generateUUID(rng),
    day: currentDay,
    category: "stable",
    importance,
    headline: rng.pick(headlines),
    body: rng.pick(bodies),
    entityLinks,
  };
}
