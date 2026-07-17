import { createNewsItem } from "@/services/narrative/newsGenerator";
import type { NewsItem } from "@/services/narrative/newsTypes";
import type { Race, Horse } from "@/game/types";
import type { Rng } from "@/core/common/rng";

export interface CareerArcState {
  horseId: string;
  stage: "none" | "rising_star" | "contender" | "champion_or_bust" | "complete";
  stage1Day?: number;
  stage2Day?: number;
  stage3Day?: number;
  consecutiveLosses: number;
}

export function checkCareerArcTrigger(
  horse: Horse,
  arcState: CareerArcState | undefined,
  race: Race,
  position: number,
  day: number,
  rng: Rng,
): { newsItem: NewsItem | null; newArcState: CareerArcState } {
  const currentStage = arcState?.stage ?? "none";
  const consecutiveLosses = arcState?.consecutiveLosses ?? 0;

  const baseState: CareerArcState = {
    horseId: horse.id,
    stage: currentStage,
    stage1Day: arcState?.stage1Day,
    stage2Day: arcState?.stage2Day,
    stage3Day: arcState?.stage3Day,
    consecutiveLosses,
  };

  if (currentStage === "complete") {
    return { newsItem: null, newArcState: baseState };
  }

  const isWin = position === 1;
  const computedCareerWins = horse.careerWins + (isWin ? 1 : 0);

  if (isWin) {
    baseState.consecutiveLosses = 0;
  }

  if (currentStage === "none") {
    if (isWin && computedCareerWins === 3) {
      const newsItem = generateRisingStarNews(horse, day, rng);
      baseState.stage = "rising_star";
      baseState.stage1Day = day;
      return { newsItem, newArcState: baseState };
    }
    return { newsItem: null, newArcState: baseState };
  }

  if (currentStage === "rising_star") {
    const firstGradedWin = race.graded && isWin;
    if ((isWin && computedCareerWins === 5) || firstGradedWin) {
      const newsItem = generateContenderNews(horse, race, day, rng);
      baseState.stage = "contender";
      baseState.stage2Day = day;
      return { newsItem, newArcState: baseState };
    }
    return { newsItem: null, newArcState: baseState };
  }

  if (currentStage === "contender") {
    if (isWin && race.graded?.grade === "G1") {
      const newsItem = generateChampionNews(horse, race, day, rng);
      baseState.stage = "champion_or_bust";
      baseState.stage3Day = day;
      return { newsItem, newArcState: baseState };
    }

    if (!isWin) {
      baseState.consecutiveLosses = consecutiveLosses + 1;
      if (baseState.consecutiveLosses >= 3) {
        const newsItem = generateBustNews(horse, day, rng);
        baseState.stage = "champion_or_bust";
        baseState.stage3Day = day;
        return { newsItem, newArcState: baseState };
      }
    }

    return { newsItem: null, newArcState: baseState };
  }

  if (currentStage === "champion_or_bust") {
    baseState.stage = "complete";
    return { newsItem: null, newArcState: baseState };
  }

  return { newsItem: null, newArcState: baseState };
}

function generateRisingStarNews(horse: Horse, day: number, rng: Rng): NewsItem {
  const headlines = [
    `Rising Star: ${horse.name} Hits Three in a Row`,
    `${horse.name} Emerges as a Rising Star`,
    `Three and Counting: ${horse.name} on the Rise`,
    `Rising Star Alert: ${horse.name} Making Waves`,
    `${horse.name}: The Latest Rising Star on the Circuit`,
    `A Star Is Born: ${horse.name} Notches Third Win`,
    `Rising Star: ${horse.name} Turning Heads`,
    `Three Wins and Counting for ${horse.name}`,
  ];

  headlines.push(
    `The Hype is Real: ${horse.name} Wins Three Straight`,
    `${horse.name} Continues Undefeated Streak`,
    `A Force to be Reckoned With: ${horse.name}`,
    `Perfect Start: ${horse.name} Remains Unbeaten`,
    `${horse.name}'s Perfect Record Remains Intact`,
    `Can Anyone Stop ${horse.name}?`
  );

  const bodies = [
    `With a third career victory now in the books, ${horse.name} is officially on the radar as a rising star. Connections are understandably excited about what lies ahead for this promising horse.`,
    `${horse.name} has crossed the three-win milestone, and the racing world is starting to take notice. The rising star label is being bandied about with good reason.`,
    `Three wins — and counting. ${horse.name} is no longer a secret, with pundits beginning to circle the name as one to watch in the coming weeks.`,
    `The rise of ${horse.name} continues. A third career win marks the moment when a horse transitions from prospect to genuine contender, and the buzz is building.`,
    `${horse.name} has arrived. Three wins to start a career is no small feat, and the rising star chatter is fully justified.`,
    `It's official — ${horse.name} is a rising star. The three-win marker has been reached, and the racing community is paying attention.`,
    `From prospect to rising star: ${horse.name}'s third win confirms what many suspected — this horse has real talent.`,
    `The word on everyone's lips after ${horse.name}'s third win: rising star. The trajectory is pointing sharply upward.`,
  ];

  bodies.push(
    `A flawless start to a career is rare, but ${horse.name} has managed just that. The buzz surrounding this horse continues to grow with each commanding victory.`,
    `With their latest win, ${horse.name} has firmly established themselves as a horse of immense potential. The racing world is eagerly awaiting their next appearance.`,
    `The early stages of ${horse.name}'s career have been nothing short of spectacular. This rising star has all the makings of a future champion.`,
    `It's hard not to be impressed by what ${horse.name} has accomplished so early on. If they maintain this form, they will be a formidable presence in the upcoming stakes races.`,
    `Another race, another win for ${horse.name}. The perfect start to their career has trainers across the circuit sitting up and taking notice.`,
    `The hype train for ${horse.name} has officially left the station. This rising star continues to clear every hurdle placed in front of them with impressive ease.`
  );

  return createNewsItem(
    {
      day,
      category: "flavor",
      importance: "medium",
      headline: rng.pick(headlines),
      body: rng.pick(bodies),
      entityLinks: [{ type: "horse", id: horse.id, name: horse.name }],
    },
    rng,
  );
}

function generateContenderNews(horse: Horse, race: Race, day: number, rng: Rng): NewsItem {
  const raceName = race.name;
  const grade = race.graded?.grade ?? "graded";

  const headlines = [
    `Contender Status: ${horse.name} Steps Up in Class`,
    `${horse.name} Declared a Genuine Contender After ${raceName}`,
    `From Rising Star to Contender: ${horse.name} Levels Up`,
    `${horse.name} Confirms Contender Credentials in ${raceName}`,
    `The Contender Era Begins for ${horse.name}`,
    `${horse.name}: No Longer Just a Prospect — a Real Contender`,
    `Contender: ${horse.name} Has Arrived at the Top Table`,
    `${horse.name} Joins the Contender Ranks After ${raceName} Triumph`,
  ];

  headlines.push(
    `${horse.name} Stakes Claim in ${raceName}`,
    `A Statement Win for ${horse.name} in the ${grade} ${raceName}`,
    `${horse.name} Proves Mettle in ${raceName}`,
    `The Real Deal: ${horse.name} Takes the ${raceName}`,
    `${horse.name} Rises to the Occasion in the ${raceName}`,
    `Grabbing Headlines: ${horse.name} Wins the ${raceName}`
  );

  const bodies = [
    `A decisive win in the ${raceName} (${grade}) has elevated ${horse.name} from rising star to genuine contender. The racing world now knows this horse is the real deal.`,
    `${horse.name}'s victory in the ${grade} ${raceName} was a statement performance. The transition from prospect to contender is complete, and bigger targets await.`,
    `The ${raceName} proved to be the perfect stage for ${horse.name} to announce their arrival as a contender. A ${grade} win is no small achievement, and connections are dreaming big.`,
    `From rising star to contender — ${horse.name} has made the leap with a commanding performance in the ${raceName}. The horse's trajectory is unmistakably upward.`,
    `${horse.name} has crossed the threshold. A win in the ${raceName} (${grade}) signals that this horse is ready to mix it with the very best. Contender status confirmed.`,
    `The contender label fits ${horse.name} perfectly after their ${raceName} heroics. A ${grade} victory is the currency of serious racehorses, and this one just made a major deposit.`,
    `It's time to take ${horse.name} seriously as a contender. The ${raceName} win was the proof, and the racing establishment is adjusting its expectations accordingly.`,
    `${horse.name} has graduated from rising star to contender with a ${grade} win in the ${raceName}. The next challenge will define whether a championship campaign is on the cards.`,
  ];

  bodies.push(
    `Any lingering doubts about ${horse.name} were firmly put to rest following a spectacular run in the ${raceName} (${grade}). This horse is undoubtedly a contender.`,
    `Stepping up in class can expose a horse's limitations, but ${horse.name} thrived in the ${grade} ${raceName}. The transition to contender status is now complete.`,
    `The performance delivered by ${horse.name} in the ${raceName} was a clear warning to the rest of the field. This ${grade} victory marks the arrival of a serious threat.`,
    `By capturing the ${raceName}, ${horse.name} has proven they belong in the upper echelons of the sport. The ${grade} triumph solidifies their standing as a true contender.`,
    `It takes a special horse to win a ${grade} race like the ${raceName}, and ${horse.name} has shown they possess that elusive quality. The future looks incredibly bright.`,
    `The transition from rising star to proven contender is officially complete. ${horse.name}'s victory in the ${raceName} (${grade}) is a testament to their growing ability.`
  );

  return createNewsItem(
    {
      day,
      category: "racing",
      importance: "high",
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

function generateChampionNews(horse: Horse, race: Race, day: number, rng: Rng): NewsItem {
  const raceName = race.name;

  const headlines = [
    `Champion! ${horse.name} Conquers the ${raceName}`,
    `${horse.name} Reaches Champion Status with G1 Triumph`,
    `A Champion Is Crowned: ${horse.name} Wins the ${raceName}`,
    `${horse.name} — From Contender to Champion in the ${raceName}`,
    `Champion at Last: ${horse.name} Claims G1 Glory in the ${raceName}`,
    `The Crowning Moment: ${horse.name} Wins It All in the ${raceName}`,
    `${horse.name} Ascends to Champion with ${raceName} Victory`,
    `G1 Glory for ${horse.name}: A Champion Is Born in the ${raceName}`,
  ];

  headlines.push(
    `A Legend is Born: ${horse.name} Captures the ${raceName}`,
    `${horse.name} Secures Legacy with ${raceName} Win`,
    `Unforgettable: ${horse.name}'s Triumph in the ${raceName}`,
    `${horse.name} Reaches the Pinnacle in the ${raceName}`,
    `The Best in the Business: ${horse.name} Wins the ${raceName}`,
    `${horse.name} Crowned Champion After ${raceName} Masterclass`
  );

  const bodies = [
    `The moment has arrived. ${horse.name} has won the ${raceName} — a Grade 1 — and ascended to champion status. This is the culmination of a remarkable journey from rising star to contender to the very pinnacle of the sport.`,
    `${horse.name} is a champion. A G1 victory in the ${raceName} is the ultimate validation, and the emotion in the winner's circle said it all. This horse has completed the arc from prospect to champion.`,
    `A G1 win in the ${raceName} crowns ${horse.name} as a true champion. The journey has been extraordinary — three wins to rise, a graded triumph to contend, and now the ultimate prize. What a story.`,
    `Champion ${horse.name}. The words have a ring to them, and the ${raceName} victory proves they're deserved. From humble beginnings to the top of the racing world — this is what the sport is all about.`,
    `The ${raceName} will be remembered as the race that made ${horse.name} a champion. A G1 win is the gold standard, and this horse has met it with a performance for the ages.`,
    `${horse.name} has done it. A Grade 1 triumph in the ${raceName} elevates this horse from contender to champion. The career arc is complete, and what a glorious arc it has been.`,
    `All hail the champion. ${horse.name}'s victory in the ${raceName} (G1) is the defining moment of a brilliant career. From rising star to contender to champion — the journey is told in headlines.`,
    `The ${raceName} belongs to ${horse.name}, and so does the title of champion. A G1 win is the line that separates the great from the merely good, and this horse has crossed it in style.`,
  ];

  bodies.push(
    `There are wins, and then there are defining moments. ${horse.name}'s victory in the Grade 1 ${raceName} is undeniably the latter. A true champion has been crowned.`,
    `The pinnacle of the sport has been reached. By winning the ${raceName}, ${horse.name} has secured their legacy as a champion of the turf.`,
    `A masterclass in racing. ${horse.name} dismantled the field in the ${raceName} to achieve Grade 1 glory, forever etching their name in the history books as a champion.`,
    `To win a Grade 1 is the dream; to do it in the ${raceName} is legendary. ${horse.name} has cemented their status as an undisputed champion.`,
    `The title of champion is not given, it is earned. And ${horse.name} earned it emphatically with a breathtaking display in the ${raceName}.`,
    `History will remember ${horse.name}'s performance in the ${raceName}. It was the day a contender became a champion on the sport's biggest stage.`
  );

  return createNewsItem(
    {
      day,
      category: "racing",
      importance: "high",
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

function generateBustNews(horse: Horse, day: number, rng: Rng): NewsItem {
  const headlines = [
    `Fading Light: ${horse.name}'s Title Hopes Dim`,
    `${horse.name} Stumbles — Three Losses and Counting`,
    `The Contender Falters: ${horse.name} Loses Ground`,
    `Slipping Away: ${horse.name}'s Championship Dreams Fade`,
    `${horse.name}: Three Straight Losses Raise Questions`,
    `The Glow Fades: ${horse.name} No Longer the Contender They Were`,
    `Hard Times for ${horse.name} as Losses Mount`,
    `${horse.name}'s Title Bid on Life Support After Third Loss`,
  ];

  headlines.push(
    `A Bump in the Road for ${horse.name}`,
    `${horse.name}'s Form Dips After Latest Defeat`,
    `Questions Emerge as ${horse.name} Struggles`,
    `The Luster Fades: ${horse.name} Falls Short Again`,
    `${horse.name} Searches for Answers After Another Loss`,
    `Time Running Out for ${horse.name} to Reclaim Form`
  );

  const bodies = [
    `Three consecutive losses have dimmed the once-bright prospects of ${horse.name}. After rising to contender status, the horse has hit a rough patch, and questions are being asked about what comes next.`,
    `The momentum has stalled for ${horse.name}. Three straight defeats have taken the shine off a promising campaign, and connections face some tough decisions about the path forward.`,
    `It's been a difficult stretch for ${horse.name}, with three losses in a row following a promising rise to contender status. The championship dream is fading, though hope springs eternal in racing.`,
    `${horse.name} has hit a wall. After looking like a genuine contender, three consecutive losses have brought the horse back to earth. The racing world waits to see if this is a blip or a trend.`,
    `The slide continues for ${horse.name}. Three straight losses have cooled the chatter that once surrounded this horse. Whether the contender can rediscover their form remains to be seen.`,
    `From contender to question mark — ${horse.name}'s three-race losing streak has tempered expectations. The talent is still there, but racing is a confidence game, and confidence is currently in short supply.`,
    `Three losses on the trot have put ${horse.name}'s championship aspirations on hold. The horse that once looked destined for G1 glory now faces an uphill battle to reclaim that momentum.`,
    `The racing world has a short memory, and ${horse.name} is learning that the hard way. Three consecutive defeats have erased the contender narrative, replaced by whispers of doubt.`,
  ];

  bodies.push(
    `The recent string of defeats has cast a long shadow over ${horse.name}. The horse that once looked unstoppable is now desperately searching for answers.`,
    `It has been a spectacular fall from grace for ${horse.name}. Following their third straight loss, the racing community is questioning if they can ever bounce back.`,
    `The struggles continue for ${horse.name}. What seemed like a temporary blip is now looking like a significant downturn in form, leaving connections scratching their heads.`,
    `Once hailed as a top contender, ${horse.name} has failed to live up to the hype in recent outings. The pressure is mounting to deliver a positive result.`,
    `The magic seems to have faded for ${horse.name}. Another disappointing performance raises serious doubts about their ability to compete at the highest level.`,
    `With their third consecutive loss, ${horse.name} finds themselves at a crossroads. The road back to the winner's circle looks steeper than ever.`
  );

  return createNewsItem(
    {
      day,
      category: "flavor",
      importance: "medium",
      headline: rng.pick(headlines),
      body: rng.pick(bodies),
      entityLinks: [{ type: "horse", id: horse.id, name: horse.name }],
    },
    rng,
  );
}
