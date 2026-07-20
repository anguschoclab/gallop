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
    `On the Up and Up: ${horse.name} Secures Win Number Three`,
    `${horse.name} Continues Ascent with Third Victory`,
    `A Prospect No More: ${horse.name} is a Rising Star`,
    `Catching the Eye: ${horse.name} Makes It Three`,
    `${horse.name}'s Star Shines Brighter with Latest Win`,
    `The Buzz Builds Around ${horse.name} After Three Straight`
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
    `With three victories under their girth, ${horse.name} has graduated from mere prospect to a genuine rising star. The paddock chatter is growing louder by the day.`,
    `It takes something special to win three races, and ${horse.name} is showing all the signs of being a standout talent. The rising star tag is thoroughly deserved.`,
    `The spotlight is finding ${horse.name} more often these days. Three wins is the benchmark for a rising star, and this horse just cleared it with room to spare.`,
    `You can't ignore three wins. ${horse.name} is building an impressive resume early on, catching the attention of seasoned observers who know a rising star when they see one.`,
    `Expectations are shifting for ${horse.name}. Following a third career win, the narrative has firmly moved from 'promising' to 'rising star' status.`,
    `There's a palpable excitement surrounding ${horse.name}. Securing a third win confirms the early promise and cements this horse as one of the brightest rising stars in the ranks.`
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
    `${horse.name} Proves Mettle in the ${raceName}`,
    `A Serious Threat: ${horse.name} Arrives as a Contender`,
    `${horse.name} Steps Up and Delivers in the ${raceName}`,
    `No Doubts Now: ${horse.name} is a Bonafide Contender`,
    `The Elite Ranks Welcome ${horse.name} After ${raceName} Win`,
    `${horse.name} Shakes Up the Contender Picture`
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
    `The step up in class was no issue for ${horse.name}. Winning the ${raceName} (${grade}) is the hallmark of a true contender, and the rest of the division has been put on notice.`,
    `Some horses shrink from the spotlight, but ${horse.name} thrived in the ${raceName}. This ${grade} victory confirms they belong in the conversation with the elite.`,
    `The transition from rising star to proven contender is the hardest leap to make, but ${horse.name} managed it brilliantly with a win in the ${grade} ${raceName}.`,
    `Any lingering doubts about ${horse.name}'s class were erased in the ${raceName}. Claiming a ${grade} event is the ultimate proof of contender status.`,
    `The contender picture just got more complicated. ${horse.name} staked their claim forcefully by taking down the ${grade} ${raceName}.`,
    `It's a new chapter for ${horse.name}. With the ${raceName} (${grade}) trophy on the mantle, they are officially recognized as a major contender for top honors.`
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
    `Coronation Day: ${horse.name} Takes the ${raceName}`,
    `${horse.name} Achieves Immortality in the ${raceName}`,
    `The Pinnacle: ${horse.name} is a G1 Champion`,
    `${horse.name} Masters the ${raceName} to Become Champion`,
    `A Legendary Performance Secures Champion Status for ${horse.name}`,
    `${horse.name} Realizes the Ultimate Dream in the ${raceName}`
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
    `History will remember ${horse.name} as a champion. Winning the G1 ${raceName} is the peak of the sport, a fitting reward for a campaign defined by sheer class.`,
    `Tears of joy in the winner's enclosure as ${horse.name} captured the ${raceName}. This G1 triumph is the final piece of the puzzle, confirming absolute champion status.`,
    `The air is rarefied at the top, and ${horse.name} breathes it comfortably now. A devastatingly brilliant win in the ${raceName} (G1) cements their legacy as a true champion.`,
    `They asked for greatness, and ${horse.name} delivered. The ${raceName} will go down as the defining moment this horse evolved into a bona fide G1 champion.`,
    `It doesn't get better than this. ${horse.name} scaled the mountain to win the G1 ${raceName}, forever etching their name among the champions of the turf.`,
    `The long road to glory ends here. By winning the prestigious ${raceName}, ${horse.name} has proven beyond all doubt that they are a champion of the highest order.`
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
    `The Struggles Continue for ${horse.name}`,
    `${horse.name}'s Form Dips Dangerously with Third Loss`,
    `Searching for Answers: ${horse.name} Beaten Again`,
    `${horse.name}'s Star Wanes After Latest Defeat`,
    `The Fall of a Contender: ${horse.name} Loses Three Straight`,
    `${horse.name} Looks a Shadow of Their Former Self`
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
    `The magic seems to have evaporated for ${horse.name}. A third successive loss is a bitter pill to swallow for a horse that once harbored genuine championship ambitions.`,
    `It's back to the drawing board for the connections of ${horse.name}. The horse simply isn't finding the required level right now, as evidenced by three straight defeats.`,
    `The harsh reality of top-level racing is catching up with ${horse.name}. Following three consecutive losses, the contender status they once enjoyed feels like a distant memory.`,
    `Something is amiss with ${horse.name}. Another uninspiring performance makes it three losses in a row, leaving fans wondering if the best days are already behind them.`,
    `The wheels have well and truly come off the ${horse.name} bandwagon. Three defeats on the bounce have severely dented their reputation as a top-tier contender.`,
    `It's a worrying trend for ${horse.name}. The spark that defined their early success was missing again today, marking a third straight failure to deliver.`
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
