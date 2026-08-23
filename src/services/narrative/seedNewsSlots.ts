/**
 * seedNewsSlots.ts - Individual slot builder functions for seed gazette news
 *
 * Extracted from seedNewsGenerator.ts for modularity.
 */

import { createNewsItem } from "@/services/narrative/newsGenerator";
import { calculateOverallRating } from "@/core/horse/stats";
import type { NewsItem } from "@/services/narrative/newsTypes";
import type { Race, Horse, Stable } from "@/game/types";
import { isPlayerOwned, isNpcOwned } from "@/core/horse/ownership";
import type { PlayerProfile } from "@/core/stable/types";
import type { Rng } from "@/core/common/rng";

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Build the season opener news item for the player's new stable.
 *
 * @param playerProfile - Player's stable profile
 * @param day - Current game day
 * @param rng - Seeded random number generator
 * @returns Season opener news item
 */
export function buildSeasonOpener(
  playerProfile: PlayerProfile | undefined,
  day: number,
  rng: Rng,
): NewsItem {
  const stableName = playerProfile?.stableName || "A New Racing Operation";
  const ownerName = playerProfile?.ownerName || "A Daring Newcomer";

  const headlines = [
    `A New Era Begins: ${stableName} Opens Its Doors`,
    `Season Opener: ${stableName} Enters the Fray`,
    `Fresh Ambition: ${stableName} Launches Its Racing Campaign`,
    `The Sport Welcomes ${stableName} to the Ranks`,
    `New Kid on the Block: ${stableName} Ready to Race`,
    `A New Chapter: ${stableName} Takes Its First Steps`,
    `Breaking Ground: ${stableName} Joins the Racing World`,
    `From Dream to Reality: ${stableName} Begins Its Journey`,
    `Curtain Raiser: ${stableName} Officially Joins the Circuit`,
    `The Journey Begins for ${stableName}`,
    `New Syndicates in Town: ${stableName} Makes Their Debut`,
    `${stableName} Unveils Their Seasonal Strategy`,
    `A Bold Start: ${stableName} Prepares to Challenge the Elite`,
    `First Look: ${stableName} Enters the Competition`,
  ];

  const bodies = [
    `The racing world turns its attention to ${stableName}, founded by ${ownerName}. With a fresh stable and big ambitions, this new operation looks to make waves in the season ahead.`,
    `Today marks the dawn of a new racing venture as ${stableName} officially opens its doors. ${ownerName} has invested heavily in talent and facilities, signaling serious intent.`,
    `All eyes are on ${stableName} as ${ownerName} embarks on what promises to be a thrilling campaign. The new stable has spared no expense in assembling its string of horses.`,
    `The racing community welcomes ${stableName} to the fold. ${ownerName} may be new to the game, but the early signs suggest this is an operation built for success.`,
    `A fresh face on the circuit: ${stableName}, helmed by ${ownerName}, begins its journey today. Pundits are already speculating about what this ambitious newcomer might achieve.`,
    `It's official — ${stableName} is open for business. ${ownerName} has poured heart and soul into this venture, and the racing world is eager to see what unfolds.`,
    `The latest addition to the racing landscape, ${stableName}, arrives with plenty of fanfare. ${ownerName} has made it clear: they're here to compete.`,
    `With the opening of ${stableName}, ${ownerName} adds their name to the list of racing dreamers. Whether this season brings glory or heartbreak, the journey starts now.`,
    `The racing world is watching closely as ${stableName}, guided by ${ownerName}, officially joins the circuit today.`,
    `${ownerName} brings a new vision to the track with the launch of ${stableName}. It will be fascinating to see how they perform in their debut season.`,
    `With the ribbons cut and stalls open, ${stableName} is ready to race. ${ownerName} looks quietly confident about the stable's prospects.`,
    `A new contender emerges as ${stableName} begins their campaign. ${ownerName} has laid the groundwork for what hopes to be a competitive stable.`,
    `The paddock is buzzing with the arrival of ${stableName}. ${ownerName}'s operation is the latest addition to a highly competitive field.`,
    `It's day one for ${stableName}, and ${ownerName} knows the pressure is on. The early races will be a true test of their mettle.`,
  ];

  return createNewsItem(
    {
      day,
      category: "flavor",
      importance: "high",
      headline: rng.pick(headlines),
      body: rng.pick(bodies),
    },
    rng,
  );
}

/**
 * Build rival introduction news items for elite major NPC stables.
 *
 * @param stables - NPC stables to introduce
 * @param day - Current game day
 * @param rng - Seeded random number generator
 * @returns Array of news items with associated stable IDs
 */
export function buildRivalIntros(
  stables: Stable[],
  day: number,
  rng: Rng,
): { news: NewsItem; stableId: string }[] {
  const eliteMajor = stables
    .filter((s) => s.tier === "elite" && s.isMajor)
    .sort((a, b) => b.reputation - a.reputation);

  const results: { news: NewsItem; stableId: string }[] = [];

  for (const stable of eliteMajor) {
    const country = stable.country ?? "parts unknown";
    const description = stable.description ?? "a stable shrouded in mystery and intrigue";

    const headlines = [
      `Rival Profile: ${stable.name}`,
      `Who Is ${stable.name}?`,
      `Stable Spotlight: ${stable.name}`,
      `Meet the Competition: ${stable.name}`,
      `Inside ${stable.name}`,
      `The Powerhouse from ${country}: ${stable.name}`,
      `Getting to Know ${stable.name}`,
      `${stable.name}: A Force to Be Reckoned With`,
      `Scouting the Competition: ${stable.name}`,
      `The ${stable.name} Threat`,
      `Profiling the Enemy: ${stable.name}`,
      `Focus on ${stable.name}`,
      `What to Expect from ${stable.name}`,
      `${stable.name}: The View from the Outside`,
    ];

    const bodies = [
      `Based in ${country}, ${stable.name} is operated by ${stable.owner}. ${capitalize(description)} With a reputation rating of ${stable.reputation}, this elite operation is one to watch.`,
      `${stable.name}, led by ${stable.owner}, hails from ${country}. ${capitalize(description)} Their reputation of ${stable.reputation} speaks volumes about their standing in the racing world.`,
      `From ${country} comes ${stable.name}, the brainchild of ${stable.owner}. ${capitalize(description)} A reputation of ${stable.reputation} places them firmly among the elite.`,
      `${stable.owner}'s ${stable.name} is a name that commands respect in ${country}. ${capitalize(description)} With a ${stable.reputation} reputation, they are a formidable rival.`,
      `Operating out of ${country}, ${stable.name} under ${stable.owner} has built a legacy. ${capitalize(description)} Their ${stable.reputation} reputation is a testament to their excellence.`,
      `${stable.name} — ${stable.owner}'s pride and joy from ${country}. ${capitalize(description)} Boasting a reputation of ${stable.reputation}, they represent everything an elite stable should be.`,
      `The story of ${stable.name} is one of ambition and success. Founded by ${stable.owner} in ${country}, ${description} Their ${stable.reputation} reputation marks them as a true powerhouse.`,
      `In the competitive world of ${country} racing, ${stable.name} stands tall. ${stable.owner}'s operation is defined by ${capitalize(description)} A reputation of ${stable.reputation} cements their elite status.`,
      `Based in ${country}, ${stable.name} comes with high expectations. ${stable.owner}'s operation, with a reputation of ${stable.reputation}, means they shouldn't be underestimated. ${capitalize(description)}`,
      `A closer look at ${stable.name} reveals a meticulously run operation out of ${country}. ${stable.owner} sporting a reputation of ${stable.reputation}, they are primed for battle. ${capitalize(description)}`,
      `The racing scene in ${country} has produced a formidable rival in ${stable.name}. ${stable.owner}, with a solid ${stable.reputation} reputation, commands attention. ${capitalize(description)}`,
      `Operating with a reputation of ${stable.reputation}, ${stable.name} represents the best of ${country}. ${capitalize(description)} ${stable.owner} will be a tough nut to crack.`,
      `The story of ${stable.name} continues to unfold in ${country}. ${stable.owner}'s impressive ${stable.reputation} reputation precedes them. ${capitalize(description)}`,
      `Rival stable ${stable.name} from ${country} is a proven quantity with a reputation of ${stable.reputation}. ${capitalize(description)} ${stable.owner} expects them to be a constant thorn in the side.`,
    ];

    const news = createNewsItem(
      {
        day,
        category: "stable",
        importance: "low",
        headline: rng.pick(headlines),
        body: rng.pick(bodies),
        entityLinks: [{ type: "stable", id: stable.id, name: stable.name }],
      },
      rng,
    );

    results.push({ news, stableId: stable.id });
  }

  return results;
}

/**
 * Build power rankings news item from top-rated NPC horses.
 *
 * @param horses - All horses in the game
 * @param day - Current game day
 * @param rng - Seeded random number generator
 * @returns Power rankings news item or null if no NPC horses
 */
export function buildPowerRankings(horses: Horse[], day: number, rng: Rng): NewsItem | null {
  const npcHorses = horses.filter((h) => !isPlayerOwned(h) && isNpcOwned(h));
  if (npcHorses.length === 0) return null;

  const sorted = npcHorses
    .map((h) => ({ horse: h, rating: calculateOverallRating(h) }))
    .sort((a, b) => b.rating - a.rating);

  const top5 = sorted.slice(0, 5);

  const headlines = [
    `Season Power Rankings: The Elite Five`,
    `Top 5 Horses to Watch: Power Rankings Update`,
    `Power Rankings: Who Rules the Track?`,
    `The Contenders: Early-Season Power Rankings`,
    `Ranking the Best: Power Rankings Top 5`,
    `Who's Hot: Power Rankings Unveiled`,
    `The Cream of the Crop: Season Power Rankings`,
    `Early-Season Elite: Power Rankings Top 5`,
    `The Heavyweights: Season Power Rankings`,
    `Power Rankings: Sorting the Contenders from the Pretenders`,
    `The Elite Cut: Top 5 Power Rankings`,
    `Who's Number One? Season Power Rankings Revealed`,
    `Power Rankings: The Early Season Form Guide`,
    `The Track's Finest: Power Rankings`,
  ];

  const rankingText = top5
    .map((entry, i) => `${i + 1}. ${entry.horse.name} (${entry.rating} OVR)`)
    .join("  ");

  const bodies = [
    `The first power rankings of the season are in, and the competition is fierce. ${rankingText}. These are the horses to beat as the campaign gets underway.`,
    `Our analysts have crunched the numbers, and here's how the top tier stacks up: ${rankingText}. Expect these names to feature prominently in the biggest races.`,
    `Who's leading the pack? The early power rankings tell the story: ${rankingText}. Each of these runners has the class to dominate on the biggest days.`,
    `The season's first power rankings are official. ${rankingText}. If you're looking for the horses to follow, start here.`,
    `Form is temporary, class is permanent — and these horses have it in spades. ${rankingText}. The power rankings don't lie.`,
    `From the press box to the betting ring, everyone's talking about the same names: ${rankingText}. These are the horses defining the early-season narrative.`,
    `The elite of the elite, according to our latest power rankings: ${rankingText}. When the big races come calling, these are the ones who'll answer.`,
    `Our season preview wouldn't be complete without the power rankings. ${rankingText}. These five have separated themselves from the pack.`,
    `Our analysts have compiled the definitive early season power rankings: ${rankingText}. These runners are setting the standard.`,
    `The debate is over. The season's first power rankings are out: ${rankingText}. This is the benchmark for the coming months.`,
    `If you want to know who holds the cards this season, look no further than the power rankings: ${rankingText}.`,
    `The racing world is digesting the latest power rankings: ${rankingText}. The competition at the top is hotter than ever.`,
    `The form experts have spoken. The power rankings reveal the true pecking order: ${rankingText}.`,
    `These are the names striking fear into their rivals. The power rankings top five: ${rankingText}.`,
  ];

  return createNewsItem(
    {
      day,
      category: "racing",
      importance: "high",
      headline: rng.pick(headlines),
      body: rng.pick(bodies),
      entityLinks: top5.map((entry) => ({
        type: "horse" as const,
        id: entry.horse.id,
        name: entry.horse.name,
      })),
    },
    rng,
  );
}

/**
 * Build G1 spotlight news item for the first Grade 1 race of the season.
 *
 * @param races - Scheduled races
 * @param day - Current game day
 * @param rng - Seeded random number generator
 * @returns G1 spotlight news item or null if no G1 races
 */
export function buildG1Spotlight(races: Race[], day: number, rng: Rng): NewsItem | null {
  const g1Races = races.filter((r) => r.graded?.grade === "G1").sort((a, b) => a.day - b.day);

  if (g1Races.length === 0) return null;

  const g1Race = g1Races[0];

  const headlines = [
    `G1 Spotlight: ${g1Race.name} Looms Large`,
    `The First Grade 1: ${g1Race.name} on the Horizon`,
    `All Eyes on ${g1Race.name}`,
    `G1 Preview: ${g1Race.name} Set to Ignite the Season`,
    `The Main Event: ${g1Race.name} Approaches`,
    `Grade 1 Glory Awaits in the ${g1Race.name}`,
    `First G1 of the Season: ${g1Race.name}`,
    `Circle the Date: ${g1Race.name} Is Coming`,
    `The Spotlight Shines on the ${g1Race.name}`,
    `G1 Preview: The Countdown to the ${g1Race.name}`,
    `The Ultimate Prize: The ${g1Race.name} Approaches`,
    `Stakes Are High for the ${g1Race.name}`,
    `Preparing for Greatness in the ${g1Race.name}`,
    `The First Classic: The ${g1Race.name}`,
  ];

  const bodies = [
    `The first Grade 1 of the season is just around the corner. The ${g1Race.name} at ${g1Race.graded?.track ?? "a premier track"} is set to be a defining race, and the racing world is already buzzing with anticipation.`,
    `As the season gets underway, all roads lead to the ${g1Race.name}. This prestigious Grade 1 contest at ${g1Race.graded?.track ?? "a top venue"} promises to be a spectacular showdown.`,
    `Mark your calendars — the ${g1Race.name} is the first Grade 1 on the schedule, and it's shaping up to be a cracker. ${g1Race.graded?.track ?? "The host track"} will play host to what could be the race of the season.`,
    `There's no bigger early-season prize than the ${g1Race.name}. This Grade 1 spectacle at ${g1Race.graded?.track ?? "a premier venue"} is where legends are made, and the anticipation is already building.`,
    `The ${g1Race.name} stands as the first major test of the campaign. Grade 1 races don't come bigger, and ${g1Race.graded?.track ?? "the host track"} is ready for the occasion.`,
    `Talk of the season always circles back to the ${g1Race.name}. As the first Grade 1 on the calendar, it sets the tone for everything that follows at ${g1Race.graded?.track ?? "the track"}.`,
    `The weight of expectation already hangs over the ${g1Race.name}. Grade 1 glory is the ultimate prize, and ${g1Race.graded?.track ?? "the host venue"} will be the stage.`,
    `From trainers to punters, everyone has the ${g1Race.name} circled. It's the first Grade 1 of the year, and ${g1Race.graded?.track ?? "the track"} is gearing up for a race to remember.`,
    `The spotlight shines on ${g1Race.name} as the first Grade 1 of the new season. Hosted at ${g1Race.graded?.track ?? "the premier track"}, it's the race everyone wants to win.`,
    `Excitement is at fever pitch as the ${g1Race.name} approaches. The Grade 1 action at ${g1Race.graded?.track ?? "the host venue"} will set the narrative for the year.`,
    `The pinnacle of the sport returns with the ${g1Race.name}. The Grade 1 test at ${g1Race.graded?.track ?? "a top-tier track"} is the ultimate proving ground.`,
    `Every trainer dreams of winning the ${g1Race.name}. The Grade 1 feature at ${g1Race.graded?.track ?? "the venue"} is the headline event of the early season.`,
    `The countdown is on for the ${g1Race.name}. ${g1Race.graded?.track ?? "The track"} is ready to host a vintage renewal of this historic Grade 1 contest.`,
    `The ${g1Race.name} represents the holy grail of early season racing. The Grade 1 at ${g1Race.graded?.track ?? "the premier venue"} will be a battle of titans.`,
  ];

  return createNewsItem(
    {
      day,
      category: "racing",
      importance: "high",
      headline: rng.pick(headlines),
      body: rng.pick(bodies),
      entityLinks: [{ type: "race", id: g1Race.id, name: g1Race.name }],
    },
    rng,
  );
}

/**
 * Build graded preview news item for the next graded race after the G1.
 *
 * @param races - Scheduled races
 * @param g1Day - Day of the G1 race to preview after
 * @param day - Current game day
 * @param rng - Seeded random number generator
 * @returns Graded preview news item or null if no graded races after G1
 */
export function buildGradedPreview(
  races: Race[],
  g1Day: number,
  day: number,
  rng: Rng,
): NewsItem | null {
  const gradedAfterG1 = races.filter((r) => r.graded && r.day > g1Day);

  if (gradedAfterG1.length === 0) return null;

  const g2Races = gradedAfterG1
    .filter((r) => r.graded?.grade === "G2")
    .sort((a, b) => a.day - b.day);
  const g3Races = gradedAfterG1
    .filter((r) => r.graded?.grade === "G3")
    .sort((a, b) => a.day - b.day);

  const previewRace = g2Races[0] ?? g3Races[0];
  if (!previewRace) return null;

  const grade = previewRace.graded!.grade;

  const headlines = [
    `Looking Ahead: ${previewRace.name} (${grade})`,
    `Next Up: The ${previewRace.name}`,
    `On the Horizon: ${previewRace.name} (${grade})`,
    `Coming Soon: ${previewRace.name}`,
    `The Next Big Race: ${previewRace.name} (${grade})`,
    `Don't Miss: ${previewRace.name} Is Just Around the Corner`,
    `Future Stars: ${previewRace.name} Preview`,
    `Mark Your Cards: ${previewRace.name} (${grade}) Approaching`,
    `Graded Preview: The ${previewRace.name}`,
    `Next in Line: The ${previewRace.name} (${grade})`,
    `The Stakes Are High: Previewing the ${previewRace.name}`,
    `A Closer Look at the ${previewRace.name} (${grade})`,
    `The Road Ahead: The ${previewRace.name}`,
    `Graded Action Continues with the ${previewRace.name}`,
  ];

  const bodies = [
    `After the G1 action, the ${grade} ${previewRace.name} at ${previewRace.graded?.track ?? "a top track"} offers another chance for graded glory. A strong field is expected to assemble.`,
    `The ${previewRace.name}, a ${grade} contest at ${previewRace.graded?.track ?? "a premier venue"}, is the next graded race on the schedule. Connections are already plotting their paths.`,
    `Hot on the heels of the Grade 1 comes the ${previewRace.name} (${grade}). ${previewRace.graded?.track ?? "The host track"} will see another competitive field line up.`,
    `For those still hungry for graded action, the ${previewRace.name} (${grade}) at ${previewRace.graded?.track ?? "a quality track"} is next on the docket.`,
    `The ${grade} ${previewRace.name} is the next stop on the graded stakes trail. ${previewRace.graded?.track ?? "The host venue"} promises another thrilling contest.`,
    `With the G1 in the books, attention turns to the ${previewRace.name} (${grade}). ${previewRace.graded?.track ?? "The track"} is preparing for what should be a fiercely contested affair.`,
    `Next on the graded stakes calendar: the ${previewRace.name} (${grade}). ${previewRace.graded?.track ?? "A top venue"} plays host to this key early-season contest.`,
    `The ${previewRace.name} (${grade}) is the next graded race to circle. ${previewRace.graded?.track ?? "The host track"} will be the venue for what promises to be a quality renewal.`,
    `The graded stakes calendar rolls on with the ${previewRace.name} (${grade}). ${previewRace.graded?.track ?? "The host track"} will see some serious talent on display.`,
    `For those seeking graded glory, the ${previewRace.name} (${grade}) is the next target. The race at ${previewRace.graded?.track ?? "a top track"} is wide open.`,
    `The ${previewRace.name} (${grade}) offers a crucial stepping stone for many runners. ${previewRace.graded?.track ?? "The venue"} is expecting a highly competitive field.`,
    `The spotlight shifts to the ${previewRace.name} (${grade}). Connections are finalizing preparations for the clash at ${previewRace.graded?.track ?? "the track"}.`,
    `The ${previewRace.name} (${grade}) is the next significant milestone on the calendar. ${previewRace.graded?.track ?? "A quality venue"} hosts this compelling matchup.`,
    `The graded action continues apace with the ${previewRace.name} (${grade}) at ${previewRace.graded?.track ?? "the host track"}. Expect fireworks.`,
  ];

  return createNewsItem(
    {
      day,
      category: "racing",
      importance: "medium",
      headline: rng.pick(headlines),
      body: rng.pick(bodies),
      entityLinks: [{ type: "race", id: previewRace.id, name: previewRace.name }],
    },
    rng,
  );
}

/**
 * Build bloodline insight news item analyzing the most prevalent bloodline.
 *
 * @param horses - All horses in the game
 * @param day - Current game day
 * @param rng - Seeded random number generator
 * @returns Bloodline insight news item or null if no NPC horses
 */
export function buildBloodlineInsight(horses: Horse[], day: number, rng: Rng): NewsItem | null {
  const npcHorses = horses.filter((h) => !isPlayerOwned(h) && isNpcOwned(h));
  if (npcHorses.length === 0) return null;

  const eliteHorses = npcHorses.filter((h) => calculateOverallRating(h) >= 80);
  const pool = eliteHorses.length > 0 ? eliteHorses : npcHorses;

  const bloodlineCounts: Record<string, number> = {};
  for (const h of pool) {
    const bl = h.bloodline ?? "Unknown";
    bloodlineCounts[bl] = (bloodlineCounts[bl] ?? 0) + 1;
  }

  const sortedBloodlines = Object.entries(bloodlineCounts).sort((a, b) => b[1] - a[1]);
  if (sortedBloodlines.length === 0) return null;

  const modeBloodline = sortedBloodlines[0][0];
  const count = sortedBloodlines[0][1];

  const headlines = [
    `Bloodline Insight: ${modeBloodline} Dominates the Ranks`,
    `The ${modeBloodline} Influence: Bloodline Deep Dive`,
    `Bloodlines That Matter: ${modeBloodline} Leads the Way`,
    `Genetic Gold: ${modeBloodline} Bloodline Stamps Its Authority`,
    `The ${modeBloodline} Legacy: Bloodline in Numbers`,
    `Pedigree Power: ${modeBloodline} Bloodline Tops the Charts`,
    `Bloodline Breakdown: ${modeBloodline} Reigns Supreme`,
    `Why ${modeBloodline} Is the Bloodline to Watch`,
    `The ${modeBloodline} Dynasty: A Pedigree Analysis`,
    `By the Numbers: The Dominance of ${modeBloodline}`,
    `The Genetics of Success: Focusing on ${modeBloodline}`,
    `Sire Line Spotlight: ${modeBloodline}`,
    `Tracing the Blood: The ${modeBloodline} Lineage`,
    `The Prolific ${modeBloodline} Bloodline`,
  ];

  const bodies = [
    `An analysis of the current crop reveals that the ${modeBloodline} bloodline is the most prevalent among the elite ranks, with ${count} horses tracing their lineage to this influential sire line.`,
    `The ${modeBloodline} bloodline continues to exert a massive influence on the sport. Our analysis shows ${count} horses in the current population carry these prestigious genetics.`,
    `When it comes to pedigree, ${modeBloodline} is the name on everyone's lips. With ${count} representatives in the field, this bloodline's legacy shows no signs of fading.`,
    `Bloodstock analysts have long praised the ${modeBloodline} line, and the numbers back it up — ${count} horses in today's population carry this distinguished pedigree.`,
    `The dominance of the ${modeBloodline} bloodline is unmistakable. ${count} horses trace their ancestry to this line, making it the most represented in the current crop.`,
    `From breeding sheds to the winner's circle, the ${modeBloodline} influence is everywhere. With ${count} descendants currently active, this sire line's impact is profound.`,
    `It's hard to ignore the ${modeBloodline} bloodline when looking at the roster. ${count} horses carry these genetics, a testament to the lasting power of this line.`,
    `The ${modeBloodline} bloodline stands tall as the most common among today's horses, with ${count} representatives. Breeders who invested in this line are reaping the rewards.`,
    `A deep dive into the pedigrees reveals ${count} horses carrying the ${modeBloodline} bloodline. It's a clear indicator of the line's enduring quality.`,
    `The ${modeBloodline} influence is undeniable, with ${count} runners representing the sire line in the current ranks. It's a true dynasty.`,
    `The statistics are striking: ${count} active horses boast the ${modeBloodline} bloodline, proving the line's exceptional prepotency.`,
    `Breeders continue to flock to the ${modeBloodline} line, and with good reason. There are ${count} horses from this lineage currently making their mark.`,
    `The ${modeBloodline} bloodline remains the gold standard, with ${count} representatives flying the flag. The genetic legacy is secure.`,
    `It's the bloodline that keeps on giving. ${count} horses trace their roots to ${modeBloodline}, cementing its status as the most dominant force in breeding.`,
  ];

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
 * Build veteran champion news item featuring the oldest highest-fame horse.
 *
 * @param horses - All horses in the game
 * @param day - Current game day
 * @param rng - Seeded random number generator
 * @returns Veteran champion news item or null if no veterans
 */
export function buildVeteranChampion(horses: Horse[], day: number, rng: Rng): NewsItem | null {
  const veterans = horses.filter((h) => h.age >= 6);
  if (veterans.length === 0) return null;

  const sorted = veterans.sort((a, b) => b.fame - a.fame);
  const champion = sorted[0];

  const headlines = [
    `Veteran Champion: ${champion.name} Still Going Strong`,
    `Age Is Just a Number: Veteran ${champion.name} Still Going Strong`,
    `The Old Warrior: Veteran ${champion.name} Defies the Years`,
    `Seasoned Star: Veteran ${champion.name} Remains a Force`,
    `${champion.name}: A Veteran's Tale`,
    `Experience Counts: Veteran ${champion.name} Leads the Old Guard`,
    `The Grand Old Campaigner: Veteran ${champion.name}`,
    `${champion.name} — Still the Pride of the Veteran Ranks`,
    `The Enduring Appeal of ${champion.name}`,
    `${champion.name}: The Senior Statesman of the Turf`,
    `A Testament to Durability: ${champion.name}`,
    `The Veteran's Class: ${champion.name}`,
    `Still Got It: The Continuing Story of ${champion.name}`,
    `${champion.name} Leads the Veteran Division`,
  ];

  const bodies = [
    `At ${champion.age} years old, ${champion.name} continues to defy Father Time. With a fame rating of ${champion.fame}, this veteran campaigner remains one of the most respected horses in training.`,
    `${champion.name} may be ${champion.age} years of age, but the old warrior shows no signs of slowing down. A fame of ${champion.fame} marks this horse as a true legend of the sport.`,
    `They say class is permanent, and ${champion.name} is living proof. At ${champion.age} years old with a fame of ${champion.fame}, this grand campaigner continues to inspire.`,
    `In an era where young horses often grab the headlines, ${champion.name} — ${champion.age} years old and boasting a fame of ${champion.fame} — reminds us that experience is irreplaceable.`,
    `The veteran ranks are led by the incomparable ${champion.name}. At ${champion.age} years of age and a fame rating of ${champion.fame}, this horse is a living legend.`,
    `${champion.name} has seen it all and done it all. At ${champion.age} years old, with a fame of ${champion.fame}, this horse's longevity is a testament to sound breeding and careful handling.`,
    `Few horses race into their veteran years with the distinction of ${champion.name}. Now ${champion.age} years old with a fame of ${champion.fame}, this campaigner is a fan favorite.`,
    `The story of ${champion.name} is one of durability and class. ${champion.age} years old and still competing, with a fame of ${champion.fame}, this horse embodies the spirit of the sport.`,
    `The senior statesman of the turf, ${champion.name}, remains a formidable presence at ${champion.age} years old. A fame of ${champion.fame} highlights their remarkable career.`,
    `Durability and class define ${champion.name}. Still racing at ${champion.age} with a fame of ${champion.fame}, they are a credit to their connections.`,
    `The veteran division is headlined by ${champion.name}. At ${champion.age} years old, with a fame of ${champion.fame}, they continue to capture the public's imagination.`,
    `Age has not withered the appeal of ${champion.name}. The ${champion.age}-year-old veteran boasts a fame of ${champion.fame} and remains a serious contender.`,
    `The continuing story of ${champion.name} is one of racing's great narratives. At ${champion.age} years of age and a fame rating of ${champion.fame}, they are simply iconic.`,
    `${champion.name} shows no signs of relinquishing their status as top veteran. The ${champion.age}-year-old, with a fame of ${champion.fame}, remains a benchmark for excellence.`,
  ];

  return createNewsItem(
    {
      day,
      category: "flavor",
      importance: "low",
      headline: rng.pick(headlines),
      body: rng.pick(bodies),
      entityLinks: [{ type: "horse", id: champion.id, name: champion.name }],
    },
    rng,
  );
}
