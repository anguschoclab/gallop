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
import { createNewsItem } from "@/services/narrative/newsGenerator";
import type {
  NewsItem,
  NewsCategory,
  NewsImportance,
  EntityLink,
} from "@/services/narrative/newsTypes";
import type { Horse, Race, Stable } from "@/game/types";
import type { Rng } from "@/core/common/rng";
import type { CareerArcState } from "@/services/narrative/careerArcGenerator";

/**
 * Build a rivalry news item from headline/body arrays with deterministic RNG selection.
 *
 * @param headlines - Array of possible headline strings
 * @param bodies - Array of possible body strings
 * @param fields - Common NewsItem fields (day, category, importance, entityLinks)
 * @param fields.day
 * @param fields.category
 * @param fields.importance
 * @param fields.entityLinks
 * @param rng - Seeded RNG for deterministic selection and ID generation
 * @returns A complete NewsItem
 */
function buildRivalryNews(
  headlines: string[],
  bodies: string[],
  fields: {
    day: number;
    category: NewsCategory;
    importance: NewsImportance;
    entityLinks: EntityLink[];
  },
  rng: Rng,
): NewsItem {
  return createNewsItem({ ...fields, headline: rng.pick(headlines), body: rng.pick(bodies) }, rng);
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
    `Target Acquired: ${stable.name} Takes Aim`,
    `${stable.name} Makes Their Move`,
    `The Rivalry Begins: ${stable.name} Looks to Topple the Hierarchy`,
    `A Rivalry is Born: ${stable.name} Sounds the Alarm`,
    `Shots Fired: ${stable.name} Demands Respect`,
    `Under Pressure: ${stable.name} Enters the Fray`,
    `A New Adversary: ${stable.name} Emerges from the Pack`,
    `Staking Their Claim: ${stable.name} Challenges the Status Quo`,
  ];

  const bodies = [
    `The racing community is buzzing as ${stable.name} has emerged as a formidable rival. Sources close to the stable indicate they're prepared to do whatever it takes to claim victory.`,
    `A new chapter in racing rivalry has begun. ${stable.name} has made their intentions clear, and the competition is about to heat up.`,
    `Tensions are running high as ${stable.name} steps up to challenge for dominance. This rivalry is one to watch.`,
    `Whispers in the paddock have turned to outright declarations. ${stable.name} has set their sights on taking you down.`,
    `The gloves are off. ${stable.name} is making moves that suggest they see you as their primary obstacle to the top.`,
    `It's no longer just business for ${stable.name}. They're targeting your runners specifically, signaling the start of a bitter feud.`,
    `In a surprising development, ${stable.name} has begun actively shadowing your stable's entries, ensuring their top runners are present in your key races.`,
    `The paddock chatter has focused heavily on ${stable.name} this week. They're making no secret of their ambition to unseat you as the top syndicate.`,
    `${stable.name} has officially entered the conversation. Insiders suggest they've completely retooled their strategy to counter your stable's success.`,
    `A palpable shift in paddock dynamics is underway. Representatives from ${stable.name} have been particularly vocal about their intent to challenge your reign.`,
    `It appears ${stable.name} has decided that friendly competition is no longer enough. They're openly aiming to disrupt your campaign at every turn.`,
    `Word on the backside is that ${stable.name} is building a war chest specifically to outbid and outrace your operation in the coming months.`,
    `${stable.name} has clearly marked you as their primary target. Their recent string of entries suggests a calculated plan to contest your dominance.`,
    `The competitive landscape has shifted as ${stable.name} steps into the role of primary antagonist. The rest of the season promises serious fireworks.`,
  ];

  return buildRivalryNews(
    headlines,
    bodies,
    {
      day: currentDay,
      category: "stable",
      importance: "medium",
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
  arcContext?: { horseName: string; arcStage: CareerArcState["stage"] },
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
        `Dominance Reasserted: ${playerHorse.name} Leaves ${rivalHorse.name} Behind`,
        `Sweet Victory: ${playerHorse.name} Dusts ${rivalHorse.name} in Feud`,
        `Rivalry Update: ${playerHorse.name} Proves Too Much for ${rivalHorse.name}`,
        `${playerHorse.name} Has the Final Word Against ${rivalHorse.name}`,
        `Grudge Match Decided: ${playerHorse.name} Outclasses ${rivalHorse.name}`,
        `Score Settled: ${playerHorse.name} Takes Down ${rivalHorse.name}`,
        `Upper Hand: ${playerHorse.name} Eclipses ${rivalHorse.name}`,
        `${playerHorse.name} Wins the Battle Against ${rivalHorse.name}`,
      ]
    : [
        `Grudge Match Defeat: ${rivalHorse.name} Tops ${playerHorse.name}`,
        `${rivalHorse.name} Prevails in Grudge Match Against ${playerHorse.name}`,
        `Bitter Loss: ${playerHorse.name} Falls to ${rivalHorse.name}`,
        `Rivalry Intensifies: ${rivalHorse.name} Beats ${playerHorse.name}`,
        `${rivalHorse.name} Takes the Spoils Against ${playerHorse.name}`,
        `Heartbreak: ${playerHorse.name} Edged Out by ${rivalHorse.name}`,
        `Rivalry Stings: ${rivalHorse.name} Bested ${playerHorse.name}`,
        `A Bitter Pill: ${playerHorse.name} Surrenders to ${rivalHorse.name}`,
        `Bragging Rights Lost: ${rivalHorse.name} Takes Down ${playerHorse.name}`,
        `${rivalHorse.name} Makes a Point Against ${playerHorse.name}`,
        `Feud Escalates: ${rivalHorse.name} Trumps ${playerHorse.name}`,
        `Tough Beat: ${playerHorse.name} Plays Second Fiddle to ${rivalHorse.name}`,
        `Rivals Rejoice: ${rivalHorse.name} Defeats ${playerHorse.name}`,
        `${rivalHorse.name} Turns the Tables on ${playerHorse.name}`,
      ];

  const bodies = playerWon
    ? [
        `In a highly anticipated grudge match, ${playerHorse.name} delivered a stunning victory over ${rivalHorse.name}. The rivalry between these stables continues to intensify.`,
        `The racing world watched as ${playerHorse.name} outdueled ${rivalHorse.name} in a grudge match that will be talked about for weeks. This victory sends a clear message.`,
        `${playerHorse.name} proved superior in today's grudge match against ${rivalHorse.name}, adding another chapter to this heated rivalry.`,
        `There was no love lost as ${playerHorse.name} crossed the wire ahead of ${rivalHorse.name}, securing ultimate bragging rights for the stable.`,
        `The tension was electric, but ${playerHorse.name} held their nerve to deliver a crushing blow to ${rivalHorse.name} in today's bitter contest.`,
        `${playerHorse.name} didn't just win today; they made sure ${rivalHorse.name} saw them do it, further fueling the fire between these camps.`,
        `The grandstand erupted as ${playerHorse.name} put ${rivalHorse.name} firmly in the rearview mirror. It's a massive moral victory for the stable.`,
        `Questions about who holds the upper hand were answered decisively today when ${playerHorse.name} dominated ${rivalHorse.name} in their head-to-head matchup.`,
        `${playerHorse.name} showed incredible grit to hold off ${rivalHorse.name} in a race that felt more like a street fight than a sporting event.`,
        `With bragging rights on the line, ${playerHorse.name} rose to the occasion, leaving a defeated ${rivalHorse.name} to wonder what went wrong.`,
        `The tension in the paddock was thick, but ${playerHorse.name} let their performance do the talking, securing a sweet victory over rival ${rivalHorse.name}.`,
        `It was billed as the matchup of the day, and ${playerHorse.name} delivered, ensuring ${rivalHorse.name} took second best in this ongoing feud.`,
        `${playerHorse.name} executed the game plan flawlessly, neutralizing the threat from ${rivalHorse.name} and taking home the coveted victory.`,
        `The rivalry took center stage, and ${playerHorse.name} absolutely shined, leaving ${rivalHorse.name} grasping at straws in the final furlongs.`,
      ]
    : [
        `In a stunning upset, ${rivalHorse.name} defeated ${playerHorse.name} in today's grudge match. The rivalry between these stables shows no sign of cooling down.`,
        `${rivalHorse.name} claimed victory over ${playerHorse.name} in a grudge match that has the racing community divided. The tension is palpable.`,
        `A bitter defeat for ${playerHorse.name} as ${rivalHorse.name} takes the grudge match. This rivalry is far from over.`,
        `The hype was real, and unfortunately, ${rivalHorse.name} backed it up by leaving ${playerHorse.name} in their wake today.`,
        `It's a tough pill to swallow for the stable as ${rivalHorse.name} got the better of ${playerHorse.name} in a closely watched battle.`,
        `Tempers flared post-race after ${rivalHorse.name} managed to outclass ${playerHorse.name}, shifting the momentum squarely to the rival camp.`,
        `Despite a valiant effort, ${playerHorse.name} couldn't overcome ${rivalHorse.name} today. The rival stable was quick to gloat in the winner's circle.`,
        `A frustrating result for the stable as ${rivalHorse.name} had the perfect trip, denying ${playerHorse.name} the crucial victory in this grudge match.`,
        `${rivalHorse.name} looked sharp from the break, ultimately putting away ${playerHorse.name} and taking the latest round of this bitter feud.`,
        `The highly publicized showdown went the way of the rivals, with ${rivalHorse.name} finding an extra gear that ${playerHorse.name} simply didn't have today.`,
        `It was a difficult watch for the stable connections as ${rivalHorse.name} effortlessly glided past ${playerHorse.name} to claim bragging rights.`,
        `${rivalHorse.name} made a massive statement today, leaving ${playerHorse.name} with no excuses in a race that will undoubtedly sting.`,
        `The rival camp executed perfectly, and unfortunately for ${playerHorse.name}, they ended up on the wrong side of the highlight reel against ${rivalHorse.name}.`,
        `A bitter outcome in a race with so much pride on the line. ${rivalHorse.name} took the honors, sending ${playerHorse.name} back to the drawing board.`,
      ];

  // Arc-aware body variants: inject career arc context when available
  if (arcContext) {
    const { horseName, arcStage } = arcContext;
    if (arcStage === "champion_or_bust") {
      if (playerWon) {
        bodies.push(
          `${horseName} wasn't just racing for pride today — a championship legacy was on the line. Defeating ${rivalHorse.name} in this grudge match sends a message that the champion's resolve is unbreakable.`,
          `The championship dream lives on. ${horseName} overcame ${rivalHorse.name} in a grudge match that felt like a title defense. This victory could define the season.`,
        );
      } else {
        bodies.push(
          `A devastating blow to ${horseName}'s championship aspirations. Losing to ${rivalHorse.name} in this grudge match raises serious questions about whether the title bid can survive.`,
          `The championship arc hangs by a thread after ${horseName} fell to ${rivalHorse.name}. This wasn't just a grudge match — it was a potential turning point in a career.`,
        );
      }
    } else if (arcStage === "contender") {
      if (playerWon) {
        bodies.push(
          `${horseName}'s contender status was validated in the fire of this grudge match. Beating ${rivalHorse.name} proves the horse has the mettle for the biggest stages.`,
        );
      } else {
        bodies.push(
          `A setback for ${horseName}'s contender campaign. Losing to ${rivalHorse.name} in this grudge match will test the horse's resilience and the stable's confidence.`,
        );
      }
    } else if (arcStage === "rising_star") {
      if (playerWon) {
        bodies.push(
          `Rising star ${horseName} passed the grudge match test with flying colors. Beating ${rivalHorse.name} confirms the hype is real and the trajectory is still pointing up.`,
        );
      } else {
        bodies.push(
          `A reality check for rising star ${horseName}. ${rivalHorse.name} proved too tough in this grudge match, but how the young horse responds will define the career arc.`,
        );
      }
    }
  }

  return buildRivalryNews(
    headlines,
    bodies,
    {
      day: currentDay,
      category: "racing",
      importance: "high",
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
    `A New Sovereign: ${rivalStable.name} Rules ${region}`,
    `${region} Dynasty Ends: ${rivalStable.name} Takes Over`,
    `Tides Turn in ${region}: ${rivalStable.name} Assumes Control`,
    `The Guard Changes in ${region} to ${rivalStable.name}`,
    `Reign Interrupted: ${rivalStable.name} Conquers ${region}`,
    `${region}'s Top Spot Seized by ${rivalStable.name}`,
    `Usurped! ${rivalStable.name} Now Dominates ${region}`,
    `End of an Era: ${rivalStable.name} is the New ${region} King`,
  ];

  const bodies = [
    `In a stunning development, ${rivalStable.name} has unseated the previous regional king in ${region}. The balance of power in the region has shifted dramatically.`,
    `${rivalStable.name} has emerged as the new dominant force in ${region}, ending the reign of the previous regional king. This marks a significant power shift.`,
    `The racing landscape in ${region} has changed as ${rivalStable.name} takes control as the new regional king. Competition in the region is about to intensify.`,
    `Years of dominance have been upended as ${rivalStable.name} officially takes the reins in ${region}. Local syndicates are already rethinking their strategies.`,
    `The crown is heavy, but ${rivalStable.name} seems ready to wear it after forcefully seizing control of ${region}'s competitive circuit.`,
    `It's a tough day for the old guard. ${rivalStable.name} has marched into ${region} and completely rewritten the local hierarchy.`,
    `The long-standing hierarchy in ${region} has finally cracked. ${rivalStable.name} has proven too strong, officially claiming the title of regional powerhouse.`,
    `Local racing fans are still processing the shakeup. ${rivalStable.name} has systematically dismantled the competition to become the new undeniable king of ${region}.`,
    `What seemed like an unshakeable grip on ${region} has slipped. ${rivalStable.name} has swooped in, accumulating the wins necessary to take the regional crown.`,
    `The writing has been on the wall for weeks, but it's now official: ${rivalStable.name} rules ${region}. The former kings have been relegated to challengers.`,
    `A seismic shift in the local racing economy today, as ${rivalStable.name} was formally recognized as the supreme stable operating within ${region}.`,
    `Rival syndicates in ${region} will now have to answer to ${rivalStable.name}, who have forcefully evicted the previous leaders from the top of the regional standings.`,
    `The takeover of ${region} by ${rivalStable.name} is complete. They've outmaneuvered the old establishment to usher in a new era of dominance.`,
    `${rivalStable.name} threw everything they had into conquering ${region}, and the gamble paid off. The former regional king has been emphatically dethroned.`,
  ];

  return buildRivalryNews(
    headlines,
    bodies,
    {
      day: currentDay,
      category: "stable",
      importance: "high",
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
  arcContext?: { horseName: string; arcStage: CareerArcState["stage"] },
): NewsItem | null {
  if (newFriction < 80 || oldFriction >= 80) return null;

  const headlines = [
    `Rivalry Escalates: Tensions Boil Over with ${stable.name}`,
    `Heated Rivalry: ${stable.name} Takes It to the Next Level`,
    `No Love Lost: ${stable.name} Intensifies Rivalry`,
    `Boiling Point: The Feud with ${stable.name} Worsens`,
    `Hostilities Increase Between You and ${stable.name}`,
    `War of Words: ${stable.name} Escalates the Feud`,
    `Breaking Point: Hostility Peaks with ${stable.name}`,
    `Outright Warfare: The ${stable.name} Feud Deepens`,
    `Friction Hits Critical Mass with ${stable.name}`,
    `Gloves Off: ${stable.name} Ignites a Bitter War`,
    `The Animosity Grows: ${stable.name} Refuses to Back Down`,
    `A Toxic Rivalry: Things Get Ugly with ${stable.name}`,
    `Blood Feud: ${stable.name} Crosses the Line`,
    `Bad Blood: ${stable.name} Strains Relations to the Limit`,
  ];

  const bodies = [
    `The rivalry with ${stable.name} has escalated to dangerous levels. Both sides are digging in, and observers predict this will only get worse before it gets better.`,
    `What was once competitive rivalry has become heated. ${stable.name} has taken aggressive actions that have raised tensions significantly.`,
    `The situation with ${stable.name} has deteriorated. This is no longer friendly competition - this is a heated rivalry with real consequences.`,
    `Recent comments to the press from ${stable.name} have thrown gasoline on the fire. This feud is rapidly spiraling out of control.`,
    `It's getting personal. The actions of ${stable.name} have crossed a line, turning this sporting rivalry into a bitter, all-out war.`,
    `Trackside officials are reportedly monitoring the situation as animosity with ${stable.name} reaches an unprecedented high this week.`,
    `Any pretense of sportsmanship has vanished. The feud with ${stable.name} has turned remarkably sour, with both sides exchanging thinly veiled threats in the press.`,
    `The paddock was buzzing this morning after a heated exchange between representatives from your stable and ${stable.name}. The rivalry has never been more intense.`,
    `Industry insiders are shocked by how quickly the relationship with ${stable.name} has deteriorated. This is fast becoming one of the most toxic feuds in recent memory.`,
    `Attempts to cool tensions have utterly failed. ${stable.name} appears entirely committed to a scorched-earth policy against your racing operation.`,
    `The friction with ${stable.name} has officially hit critical mass. Associates are being warned to keep their distance as the bad blood threatens to spill over.`,
    `It's open warfare on the track now. ${stable.name} has essentially declared that their primary goal for the season is to ensure your stable's failure.`,
    `The feud has escalated beyond simple competition. ${stable.name} is making aggressive, calculated moves intended to directly damage your stable's reputation and success.`,
    `Whatever mutual respect once existed is gone. ${stable.name} has ramped up hostilities, ensuring that every time your horses meet, it will be an absolute battle.`,
  ];

  // Arc-aware body variants: inject career arc context when available
  if (arcContext) {
    const { horseName, arcStage } = arcContext;
    if (arcStage === "champion_or_bust") {
      bodies.push(
        `The feud with ${stable.name} has reached a boiling point, and ${horseName} — fighting to cement a championship legacy — finds itself in the crosshairs. Every race against this rival now carries the weight of a career.`,
        `As ${horseName} chases championship glory, ${stable.name} has made it their mission to play the spoiler. The escalation is personal, and the stakes couldn't be higher.`,
        `${horseName}'s championship bid is under direct threat. ${stable.name} has escalated hostilities to a level that suggests they'd rather deny your horse glory than win for themselves.`,
      );
    } else if (arcStage === "contender") {
      bodies.push(
        `With ${horseName} rising as a genuine contender, ${stable.name} has turned up the heat. The rivalry is no longer just about pride — it's about who gets to contend at the highest level.`,
        `${horseName}'s ascent has clearly rattled ${stable.name}, who have escalated their attacks. The contender's momentum is being directly challenged by a rival with nothing to lose.`,
      );
    } else if (arcStage === "rising_star") {
      bodies.push(
        `The rising star ${horseName} has become a particular target of ${stable.name}'s escalation. The rival stable seems determined to snuff out the momentum before it becomes unstoppable.`,
        `${stable.name} has singled out rising star ${horseName} as the focal point of their escalated hostilities. It's a calculated move — take out the brightest light before it shines too bright.`,
      );
    }
  }

  return buildRivalryNews(
    headlines,
    bodies,
    {
      day: currentDay,
      category: "stable",
      importance: "high",
      entityLinks: [{ type: "stable", id: stable.id, name: stable.name }],
    },
    rng,
  );
}

/**
 * Generate a stable intro news item. Used for retroactive introductions
 * when a rivalry emerges and the stable was never previously introduced.
 *
 * @param stable - The stable to introduce
 * @param day - Current simulation day
 * @param rng - Seeded RNG for deterministic selection
 * @returns A stable intro NewsItem
 */
export function generateStableIntroNews(stable: Stable, day: number, rng: Rng): NewsItem {
  const country = stable.country ?? "parts unknown";
  const description = stable.description ?? "a stable with a reputation that precedes it";
  const tier = stable.tier ?? "mid";

  const headlines = [
    `Who Is ${stable.name}?`,
    `Stable Profile: ${stable.name}`,
    `Getting to Know ${stable.name}`,
    `Inside ${stable.name}`,
    `Meet the Competition: ${stable.name}`,
    `Stable Spotlight: ${stable.name}`,
    `${stable.name}: A Closer Look`,
    `Introducing ${stable.name}`,
  ];

  const bodies = [
    `Based in ${country}, ${stable.name} is operated by ${stable.owner}. ${description} As a ${tier} tier operation, they're a name worth remembering.`,
    `${stable.name}, led by ${stable.owner}, hails from ${country}. ${description} Their ${tier} tier status marks them as a serious player in the racing world.`,
    `From ${country} comes ${stable.name}, the brainchild of ${stable.owner}. ${description} This ${tier} tier stable is one to watch.`,
    `${stable.owner}'s ${stable.name} is a name that commands respect in ${country}. ${description} As a ${tier} tier operation, they mean business.`,
    `Operating out of ${country}, ${stable.name} under ${stable.owner} has built a growing reputation. ${description} Their ${tier} tier standing speaks for itself.`,
    `${stable.name} — ${stable.owner}'s pride and joy from ${country}. ${description} A ${tier} tier stable with ambitions to match.`,
    `The story of ${stable.name} is one of ambition and grit. Founded by ${stable.owner} in ${country}, ${description} Their ${tier} tier status cements their place among the racing elite.`,
    `In the competitive world of ${country} racing, ${stable.name} stands tall. ${stable.owner}'s operation is defined by ${description} A ${tier} tier stable through and through.`,
  ];

  return buildRivalryNews(
    headlines,
    bodies,
    {
      day,
      category: "stable",
      importance: "low",
      entityLinks: [{ type: "stable", id: stable.id, name: stable.name }],
    },
    rng,
  );
}
