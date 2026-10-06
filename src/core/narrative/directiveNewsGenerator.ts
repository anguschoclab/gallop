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
        `${stable.name} Fights to Stay Afloat`,
        `${stable.name} Forced to Scale Back`,
        `${stable.name} Hits the Financial Wall`,
        `${stable.name} Issues Dire Financial Warning`,
        `${stable.name} Operations Hit by Cash Crunch`,
        `${stable.name} Operations Threatened by Debts`,
        `${stable.name} Operations in Jeopardy`,
        `${stable.name} Scrambles for Cash`,
        `${stable.name} Sounds the Alarm on Finances`,
        `${stable.name} Stares Down Bankruptcy`,
        `${stable.name} Struggles to Stay Afloat`,
        `${stable.name} Struggles with Mounting Losses`,
        `${stable.name} on the Brink of Insolvency`,
        `${stable.name}'s Finances Take a Hit`,
        `A Cash Crisis Emerges at ${stable.name}`,
        `A Cash Crisis at ${stable.name}`,
        `A Harsh Reality for ${stable.name}`,
        `Austerity Measures Expected at ${stable.name}`,
        `Breaking Point: ${stable.name} Runs Out of Runway`,
        `Broke and Desperate: The Plight of ${stable.name}`,
        `Can ${stable.name} Survive Its Financial Woes?`,
        `Cash Flow Crisis Rocks ${stable.name}`,
        `Cash Flow Problems Plague ${stable.name}`,
        `Dark Clouds Loom Over ${stable.name}`,
        `Desperate Times: ${stable.name} in Trouble`,
        `Dire Straits: ${stable.name} in Trouble`,
        `Emergency Measures Implemented at ${stable.name}`,
        `Emergency Measures Initiated at ${stable.name}`,
        `Empty Coffers: The Plight of ${stable.name}`,
        `Financial Black Cloud Over ${stable.name}`,
        `Financial Clouds Gather Over ${stable.name}`,
        `Financial Instability Hits ${stable.name}`,
        `Financial Squeeze Puts ${stable.name} on the Brink`,
        `Hard Times Ahead for ${stable.name}`,
        `Liquidity Crisis Strikes ${stable.name}`,
        `Red Ink Flows at ${stable.name}`,
        `Red Ink at ${stable.name}`,
        `Red Ink: ${stable.name} Reaches Critical Phase`,
        `Red Ink: ${stable.name} Struggles Financially`,
        `Red Ink: ${stable.name} on the Brink`,
        `Storm Clouds Gather Over ${stable.name}`,
        `The Bank Comes Calling for ${stable.name}`,
        `The Bill Comes Due for ${stable.name}`,
        `The Financial Squeeze at ${stable.name}`,
        `The Financial Squeeze is on for ${stable.name}`,
        `The Money Dries Up for ${stable.name}`,
        `The Well Runs Dry for ${stable.name}`,
        `Tough Decisions Ahead as ${stable.name} Falters`,
        `Tough Times Ahead for ${stable.name}`,
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
        `${stable.name} Charts a New Path with ${newLabel}`,
        `${stable.name} Commits to ${newLabel}`,
        `${stable.name} Details New Strategy: ${newLabel}`,
        `${stable.name} Drops ${oldLabel}, Focuses on ${newLabel}`,
        `${stable.name} Gambles on ${newLabel} Approach`,
        `${stable.name} Looks to the Future with ${newLabel}`,
        `${stable.name} Maps Out a New Future`,
        `${stable.name} Readjusts Focus to ${newLabel}`,
        `${stable.name} Reassesses: Focus Turns to ${newLabel}`,
        `${stable.name} Refocuses on ${newLabel}`,
        `${stable.name} Reinvents Operation with ${newLabel}`,
        `${stable.name} Restructures Ahead of the Season`,
        `${stable.name} Rewrites the Playbook with ${newLabel}`,
        `${stable.name} Sets Sights on ${newLabel}`,
        `${stable.name} Shakes Things Up with ${newLabel}`,
        `${stable.name} Unveils New Operational Blueprint`,
        `${stable.name} Updates Game Plan to ${newLabel}`,
        `A Fresh Start: ${stable.name} Transitions to ${newLabel}`,
        `A New Era Begins at ${stable.name}`,
        `A New Era Begins: ${stable.name} Adopts ${newLabel}`,
        `A New Era at ${stable.name} with ${newLabel} Strategy`,
        `A New Era: ${stable.name} Sets Sights on ${newLabel}`,
        `A New Playbook for ${stable.name}: ${newLabel}`,
        `Behind ${stable.name}'s Move to ${newLabel}`,
        `Breaking Ground: ${stable.name} Goes All In on ${newLabel}`,
        `Breaking: ${stable.name} Prioritizes ${newLabel}`,
        `Changing Tides at ${stable.name}`,
        `Looking Ahead: ${stable.name} Transitions to ${newLabel}`,
        `Out with ${oldLabel}, In with ${newLabel} for ${stable.name}`,
        `Overhaul Complete: ${stable.name} Commits to ${newLabel}`,
        `Overhaul at ${stable.name}: Operations Shift to ${newLabel}`,
        `Philosophy Change at ${stable.name}: Welcome to ${newLabel}`,
        `Planning for the Future: ${stable.name} Moves to ${newLabel}`,
        `Recalibrating the Barn: ${stable.name} Embraces ${newLabel}`,
        `Rivals Notice as ${stable.name} Switches to ${newLabel}`,
        `Shaking Things Up: ${stable.name} Embraces ${newLabel}`,
        `Strategic Overhaul Confirmed at ${stable.name}`,
        `Strategic Overhaul at ${stable.name}`,
        `Strategic Pivot: ${stable.name} Embraces ${newLabel}`,
        `Strategic Shakeup: ${stable.name} Embraces ${newLabel}`,
        `Tactical Adjustment: ${stable.name} Moves to ${newLabel}`,
        `The ${newLabel} Era Begins at ${stable.name}`,
        `The Next Chapter for ${stable.name}: ${newLabel}`,
        `The Next Chapter: ${stable.name} Embraces ${newLabel}`,
        `The Next Chapter: ${stable.name} Focuses on ${newLabel}`,
        `The Strategy Evolves: ${stable.name} Unveils ${newLabel}`,
        `Turning the Page: ${stable.name}'s ${newLabel} Pivot`,
        `What the ${newLabel} Shift Means for ${stable.name}`,
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
        `${stable.name}'s ambitious ${oldLabel.toLowerCase()} strategy has collapsed under financial pressure. The operation is now simply ${description}.`,
        `${stable.name}'s bankroll has officially run dry. The stable is currently ${description}, leaving their previous ${oldLabel.toLowerCase()} strategy in ruins.`,
        `A devastating financial squeeze has forced ${stable.name} to dramatically alter course. Instead of ${oldLabel.toLowerCase()}, they are now ${description}.`,
        `A dire warning was issued to stakeholders today. ${stable.name} has officially halted their ${oldLabel.toLowerCase()} ambitions and is heavily ${description}.`,
        `A harsh economic reality has forced ${stable.name} to abandon ${oldLabel.toLowerCase()}. The focus has entirely shifted to surviving as they are ${description}.`,
        `A harsh economic reality has set in for ${stable.name}. The previous strategy of ${oldLabel.toLowerCase()} is dead, and the stable is desperately ${description}.`,
        `A string of poor results and high costs have left ${stable.name} reeling. They are now officially ${description}.`,
        `An unfortunate reality has set in at ${stable.name}. Their ${oldLabel.toLowerCase()} efforts are suspended while the team is ${description}.`,
        `Belt-tightening is the new order of the day at ${stable.name}. Operations are being heavily curtailed as they are ${description}.`,
        `Cash flow problems have forced ${stable.name} into a corner. They are ${description} after abruptly terminating their ${oldLabel.toLowerCase()} agenda.`,
        `Creditors are circling ${stable.name}. Their ${oldLabel.toLowerCase()} approach is history as they focus entirely on surviving and are ${description}.`,
        `Creditors are circling as ${stable.name} abruptly ends their ${oldLabel.toLowerCase()} campaign. The front office is now entirely consumed by ${description}.`,
        `Creditors are circling as ${stable.name} admits to deep financial trouble. The former ${oldLabel.toLowerCase()} plan is gone, and the stable is ${description}.`,
        `Creditors are reportedly circling ${stable.name}. With their ${oldLabel.toLowerCase()} plans in ruins, the syndicate is ${description}.`,
        `Creditors are reportedly circling as ${stable.name} faces severe financial distress. Their ${oldLabel.toLowerCase()} plans have been completely shelved.`,
        `Desperate times call for desperate measures at ${stable.name}. Moving away from ${oldLabel.toLowerCase()}, they are now officially ${description}.`,
        `Drastic times call for drastic measures. ${stable.name} is formally ${description}, marking an abrupt end to their ${oldLabel.toLowerCase()} era.`,
        `Empty stalls and quiet barns speak volumes at ${stable.name}. The bold ${oldLabel.toLowerCase()} strategy is dead, replaced by the grim reality of ${description}.`,
        `Financial dark clouds loom over ${stable.name}. Unable to sustain ${oldLabel.toLowerCase()}, they are scaling back operations and ${description}.`,
        `Financial shortfalls have forced a massive change at ${stable.name}. The operation is now ${description}, leaving the ${oldLabel.toLowerCase()} days behind.`,
        `Financial stability is a thing of the past for ${stable.name}. Having completely dropped ${oldLabel.toLowerCase()}, the outfit is ${description}.`,
        `Following a disastrous stretch, ${stable.name} has dropped its ${oldLabel.toLowerCase()} focus and is now entirely ${description}.`,
        `It appears the bottom has fallen out at ${stable.name}. They are officially ${description}, effectively ending any plans involving ${oldLabel.toLowerCase()}.`,
        `It has been a spectacular fall from grace. By stepping back from ${oldLabel.toLowerCase()} and ${description}, ${stable.name} is fighting for sheer survival.`,
        `It is survival mode for ${stable.name}. The stable is slashing its budget and ${description} in an attempt to weather the storm.`,
        `It's a fire sale mentality over at ${stable.name}. Any remaining pretense of ${oldLabel.toLowerCase()} has vanished while the organization is ${description}.`,
        `It's a stark reversal of fortune for ${stable.name}. The previous ${oldLabel.toLowerCase()} approach has proven unsustainable, leaving the stable ${description}.`,
        `It's an open secret in the paddock: ${stable.name} is out of money. The operation is now ${description}, a far cry from their recent ${oldLabel.toLowerCase()} ambitions.`,
        `Mounting expenses have caught up with ${stable.name}. The stable is cutting costs across the board and ${description}.`,
        `Paddock whispers point to severe cash flow problems at ${stable.name}. They've dropped all ${oldLabel.toLowerCase()} ambitions and are now strictly ${description}.`,
        `Racing takes a back seat when the lights might go out. ${stable.name} has shuttered their ${oldLabel.toLowerCase()} initiative and is desperately ${description}.`,
        `Survival is now the only goal for ${stable.name}. The ${oldLabel.toLowerCase()} era is over, with management actively ${description}.`,
        `Survival is the only goal left for ${stable.name}. The ambitious ${oldLabel.toLowerCase()} strategy is gone; instead, they are ${description} just to keep the lights on.`,
        `The ambitious ${oldLabel.toLowerCase()} plan at ${stable.name} has collapsed. The stable is now significantly downsizing and ${description}.`,
        `The balance sheet at ${stable.name} makes for grim reading. After abandoning ${oldLabel.toLowerCase()}, they have no choice but to be ${description}.`,
        `The bill has come due for ${stable.name}. Stepping back from ${oldLabel.toLowerCase()}, the stable is ${description} as bankruptcy looms.`,
        `The books don't lie. ${stable.name} is hemorrhaging capital, ditching their ${oldLabel.toLowerCase()} playbook entirely and aggressively ${description}.`,
        `The bottom line looks grim for ${stable.name}. They are no longer focused on ${oldLabel.toLowerCase()} and are instead ${description}.`,
        `The financial burden has become too much for ${stable.name}. They are now ${description}, a stark contrast to their previous ${oldLabel.toLowerCase()} focus.`,
        `The financial situation at ${stable.name} has reached a boiling point. Moving away from ${oldLabel.toLowerCase()}, they are now firmly ${description}.`,
        `The ledger is bleeding red for ${stable.name}. Any hopes of continuing their ${oldLabel.toLowerCase()} campaign are dead, as they are now ${description}.`,
        `The outlook is grim at ${stable.name}. With mounting debts, the stable is abandoning ${oldLabel.toLowerCase()} and is now ${description}.`,
        `The writing is on the wall for ${stable.name}. Having exhausted their resources on ${oldLabel.toLowerCase()}, the stable is reluctantly ${description}.`,
        `The writing is on the wall for ${stable.name}. Their ambitious ${oldLabel.toLowerCase()} strategy has collapsed, leaving them ${description}.`,
        `Whispers of insolvency at ${stable.name} appear true. The stable is ${description}, a stark contrast to their previous ${oldLabel.toLowerCase()} approach.`,
        `With debts mounting, ${stable.name} has completely overhauled its plans. There will be no more ${oldLabel.toLowerCase()}; the new reality is ${description}.`,
        `With funds critically low, ${stable.name} is abandoning ${oldLabel.toLowerCase()} and is currently ${description} in an attempt to stay afloat.`,
        `With mounting debts making their prior ${oldLabel.toLowerCase()} focus impossible to sustain, ${stable.name} finds itself ${description}.`,
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
        `${stable.name} has ripped up their playbook. Out is ${oldLabel.toLowerCase()}, and in is a new directive: they are now ${description}.`,
        `${stable.name} is looking to the future with a new approach. Having evaluated their ${oldLabel.toLowerCase()} strategy, they are now ${description}.`,
        `${stable.name} is signaling a major shift in operations. By discarding ${oldLabel.toLowerCase()} in favor of ${newLabel.toLowerCase()}, they are ${description}.`,
        `A bold new vision is being implemented at ${stable.name}. The stable has transitioned away from ${oldLabel.toLowerCase()} and is currently ${description}.`,
        `A calculated change of direction is taking place at ${stable.name}. They are currently ${description}, shifting away from their past reliance on ${oldLabel.toLowerCase()}.`,
        `A calculated move by ${stable.name} management sees them stepping away from ${oldLabel.toLowerCase()}. They are now fully committed to ${newLabel.toLowerCase()}, ${description}.`,
        `A calculated pivot by ${stable.name} sees the end of their ${oldLabel.toLowerCase()} campaign as the stable is now ${description}.`,
        `A major restructuring is underway as ${stable.name} drops its ${oldLabel.toLowerCase()} approach. The stable is now ${description}, signaling a new era for the operation.`,
        `A memo went out to all staff at ${stable.name} this morning detailing a pivot away from ${oldLabel.toLowerCase()}. The operation is now completely ${description}.`,
        `A new chapter begins for ${stable.name}. By stepping away from ${oldLabel.toLowerCase()}, the organization is dedicating its resources to ${description}.`,
        `A new game plan is being implemented at ${stable.name}. Bypassing their old ${oldLabel.toLowerCase()} methods, they are decisively ${description}.`,
        `A significant reorganization at ${stable.name} has brought ${newLabel.toLowerCase()} to the forefront. The operation is ${description}, ending the focus on ${oldLabel.toLowerCase()}.`,
        `A strategic overhaul is underway as ${stable.name} drops ${oldLabel.toLowerCase()} in favor of ${newLabel.toLowerCase()}. Management is ${description}.`,
        `A strategic shakeup is occurring at ${stable.name}. Moving definitively away from ${oldLabel.toLowerCase()}, the organization is ${description}.`,
        `Adapt or perish is the rule of the track. ${stable.name} has chosen to adapt, swapping ${oldLabel.toLowerCase()} for ${newLabel.toLowerCase()} as they are now ${description}.`,
        `After re-evaluating their position, ${stable.name} is ${description}. This marks a definitive end to their ${oldLabel.toLowerCase()} phase.`,
        `Change is afoot at ${stable.name}. Management feels the ${oldLabel.toLowerCase()} approach has run its course and is instead ${description}.`,
        `Competitors are re-evaluating ${stable.name} following a surprise strategic shift. The stable has abandoned ${oldLabel.toLowerCase()} and is now entirely ${description}.`,
        `Every stable must evolve, and ${stable.name} has chosen to do so by pivoting away from ${oldLabel.toLowerCase()}. The new directive involves ${description}.`,
        `Expect a different look from ${stable.name} moving forward. The stable is officially ${description}, leaving ${oldLabel.toLowerCase()} behind.`,
        `Expect to see a different approach from ${stable.name} moving forward. The outfit is now ${description}, pivoting from ${oldLabel.toLowerCase()}.`,
        `Industry insiders are parsing ${stable.name}'s latest move: abandoning ${oldLabel.toLowerCase()} and ${description}.`,
        `Industry observers are keenly watching the overhaul at ${stable.name}. By moving past ${oldLabel.toLowerCase()} to embrace ${newLabel.toLowerCase()}, the stable is ${description}.`,
        `It is the dawn of a new strategic direction for ${stable.name}. The shift from ${oldLabel.toLowerCase()} means the stable is now ${description}.`,
        `It seems the ${oldLabel.toLowerCase()} experiment is finally over at ${stable.name}. Moving forward, the stated mandate is ${description}.`,
        `It's a new day at ${stable.name}. The stable has completely dropped ${oldLabel.toLowerCase()} from its agenda and is now enthusiastically ${description}.`,
        `It's out with the old and in with the new. ${stable.name} has formally scrapped their ${oldLabel.toLowerCase()} goals, redirecting their resources toward ${description}.`,
        `Looking to gain a competitive edge, ${stable.name} has discarded its ${oldLabel.toLowerCase()} playbook. Moving forward, the operation is ${description}.`,
        `Market observers weren't entirely surprised when ${stable.name} dropped their ${oldLabel.toLowerCase()} campaign to try ${description}. It represents a bold new chapter.`,
        `Rival operations are watching closely as ${stable.name} pivots from ${oldLabel.toLowerCase()} to ${newLabel.toLowerCase()}, ${description}.`,
        `Rivals are assessing the new threat from ${stable.name}, who have dropped ${oldLabel.toLowerCase()} in favor of a bold ${newLabel.toLowerCase()} strategy, meaning they are ${description}.`,
        `Seeking a competitive edge, ${stable.name} is recalibrating. They have benched their ${oldLabel.toLowerCase()} playbook and are ${description}.`,
        `The board at ${stable.name} has spoken, resulting in a move away from ${oldLabel.toLowerCase()}. The new mandate dictates they are ${description}.`,
        `The boardroom at ${stable.name} has dictated a change in direction. ${oldLabel.toLowerCase()} is out, and they are now focused on ${newLabel.toLowerCase()}, ${description}.`,
        `The boardroom at ${stable.name} has spoken. The old ${oldLabel.toLowerCase()} approach is out, and they are now ${description} under a ${newLabel.toLowerCase()} strategy.`,
        `The front office at ${stable.name} has signed off on a major change, moving from ${oldLabel.toLowerCase()} to ${newLabel.toLowerCase()} by ${description}.`,
        `The ownership group at ${stable.name} has demanded a change of pace. Stepping back from ${oldLabel.toLowerCase()}, the yard will focus its energy on ${description}.`,
        `The playbook has been rewritten at ${stable.name}. Having moved past ${oldLabel.toLowerCase()}, the organization is focused entirely on ${newLabel.toLowerCase()}, ${description}.`,
        `The rumor mill was right: ${stable.name} has completely shifted gears. Moving on from ${oldLabel.toLowerCase()}, they are firmly focused on ${description}.`,
        `The shift to ${newLabel.toLowerCase()} represents a bold new chapter for ${stable.name}, who are ${description} instead of pursuing ${oldLabel.toLowerCase()}.`,
        `The strategic focus at ${stable.name} has officially changed. Moving on from ${oldLabel.toLowerCase()}, the team is now ${description}.`,
        `The strategy at ${stable.name} has evolved. They are pivoting away from ${oldLabel.toLowerCase()} and fully committing to ${newLabel.toLowerCase()}, ${description}.`,
        `The strategy room at ${stable.name} has produced a new blueprint. They have pivoted from ${oldLabel.toLowerCase()} and are currently ${description}.`,
        `The strategy sessions at ${stable.name} have yielded a new plan. The stable is shedding its ${oldLabel.toLowerCase()} identity and is instead ${description}.`,
        `The transition from ${oldLabel.toLowerCase()} to ${newLabel.toLowerCase()} is official at ${stable.name}. The organization is busy ${description}.`,
        `The transition has been swift and decisive. ${stable.name} has officially concluded its ${oldLabel.toLowerCase()} phase and is enthusiastically ${description}.`,
        `The whiteboard in the front office at ${stable.name} has been wiped clean. Moving on from ${oldLabel.toLowerCase()}, the brain trust is visibly ${description}.`,
        `The winds of change are blowing through ${stable.name}. No longer content with ${oldLabel.toLowerCase()}, the stable's leadership is entirely focused on ${newLabel.toLowerCase()}, meaning they are ${description}.`,
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
