import { createNewsItem } from "@/core/narrative/newsGenerator";
import type {
  NewsItem,
  NewsCategory,
  NewsImportance,
  EntityLink,
} from "@/core/narrative/newsTypes";
import type { Horse, Race, Stable } from "@/game/types";
import type { Rng } from "@/core/common/rng";
import type { CareerArcState } from "@/core/narrative/careerArcTypes";

/**
 * Build a rivalry news item from headline/body arrays with deterministic RNG selection.
 * @param headlines
 * @param bodies
 * @param fields
 * @param fields.day
 * @param fields.category
 * @param fields.importance
 * @param fields.entityLinks
 * @param rng
 * @returns A constructed NewsItem with deterministic headline/body selection.
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
 * Generate news for a grudge match result between the player and a rival.
 * @param race
 * @param playerHorse
 * @param rivalHorse
 * @param playerWon
 * @param currentDay
 * @param rng
 * @param rivalStable
 * @param arcContext
 * @param arcContext.horseName
 * @param arcContext.arcStage
 * @returns A NewsItem describing the grudge match outcome.
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
        `Dominating Performance: ${playerHorse.name} Conquers ${rivalHorse.name}`,
        `${playerHorse.name} Secures the Win Against ${rivalHorse.name}`,
        `A Crucial Victory: ${playerHorse.name} Beats ${rivalHorse.name}`,
        `${playerHorse.name} Rises to the Challenge Over ${rivalHorse.name}`,
        `Grudge Match Success: ${playerHorse.name} Tops ${rivalHorse.name}`,
        `${playerHorse.name} Proves Elite Against ${rivalHorse.name}`,
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
        `Swallowed Pride: ${playerHorse.name} Yields to ${rivalHorse.name}`,
        `Outrun and Outclassed: ${rivalHorse.name} Humiliates ${playerHorse.name}`,
        `Stung by a Rival: ${rivalHorse.name} Handles ${playerHorse.name}`,
        `A Bitter Defeat: ${rivalHorse.name} Dispatches ${playerHorse.name}`,
        `Grudge Match Heartbreak: ${playerHorse.name} Fails to Catch ${rivalHorse.name}`,
        `Rivalry Update: ${rivalHorse.name} Establishes Dominance Over ${playerHorse.name}`,
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
        `In a race that lived up to the hype, ${playerHorse.name} showcased superior stamina to best ${rivalHorse.name}, giving the stable a much-needed victory in this ongoing feud.`,
        `The strategy paid off perfectly for ${playerHorse.name}, who stalked ${rivalHorse.name} before pouncing in the stretch to secure a memorable grudge match win.`,
        `${playerHorse.name} looked like a different animal today, easily handling the challenge from ${rivalHorse.name} and sending a strong message to the rival camp.`,
        `It was a tactical masterclass from the connections of ${playerHorse.name}, perfectly executing a plan to defeat ${rivalHorse.name} and claim regional bragging rights.`,
        `The pre-race trash talk was silenced quickly as ${playerHorse.name} put on a dominant display to beat ${rivalHorse.name} when it mattered most.`,
        `${playerHorse.name} proved that actions speak louder than words, delivering a crushing blow to ${rivalHorse.name} in a highly publicized grudge match.`,
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
        `A tactical error proved costly for ${playerHorse.name}, allowing ${rivalHorse.name} to capitalize and steal a crucial victory in this bitter rivalry.`,
        `${rivalHorse.name} simply had more gas in the tank today, pulling away from ${playerHorse.name} in a result that will sting the stable for weeks.`,
        `Despite high expectations, ${playerHorse.name} fell flat against ${rivalHorse.name}, giving the rival camp plenty of ammunition for their post-race celebrations.`,
        `It was a humbling experience for ${playerHorse.name}, who was soundly beaten by ${rivalHorse.name} in a race the stable had circled on the calendar.`,
        `${rivalHorse.name} flipped the script today, delivering an unexpected and demoralizing defeat to ${playerHorse.name} in front of a packed grandstand.`,
        `The stable is left searching for answers after ${rivalHorse.name} exposed unexpected weaknesses in ${playerHorse.name} during today's grudge match.`,
      ];

  if (arcContext) {
    const { horseName, arcStage } = arcContext;
    if (arcStage === "champion_or_bust") {
      if (playerWon) {
        bodies.push(
          `${horseName} wasn't just racing for pride today — a championship legacy was on the line. Defeating ${rivalHorse.name} in this grudge match sends a message that the champion's resolve is unbreakable.`,
          `The championship dream lives on. ${horseName} overcame ${rivalHorse.name} in a grudge match that felt like a title defense. This victory could define the season.`,
          `In a race carrying massive championship implications, ${horseName} delivered, vanquishing ${rivalHorse.name} in a grudge match that will echo throughout the season.`,
          `${horseName} refused to let ${rivalHorse.name} derail the title run. The grudge match victory is a testament to a champion's heart.`,
          `The pressure was immense, but ${horseName} handled it flawlessly, securing a grudge match win over ${rivalHorse.name} that bolsters the championship resume.`,
          `With a legacy at stake, ${horseName} rose to the occasion, leaving ${rivalHorse.name} behind and taking another crucial step toward championship glory.`,
          `${horseName} silenced the doubters and crushed ${rivalHorse.name} in a high-stakes grudge match. The championship campaign is well and truly alive.`,
          `A massive hurdle cleared for ${horseName}. The grudge match win against ${rivalHorse.name} proves the horse is ready for the ultimate prize.`,
          `${rivalHorse.name} threw everything they had at ${horseName}, but the champion stood tall. A legendary grudge match victory.`,
          `The quest for greatness continues. ${horseName} brushed aside ${rivalHorse.name} in a grudge match that solidifies their status as the horse to beat.`,
          `${horseName} demonstrated why they are the championship favorite, dominating ${rivalHorse.name} in a highly publicized grudge match.`,
          `It was a make-or-break moment, and ${horseName} made it. The grudge match victory over ${rivalHorse.name} is a massive boost for the title bid.`,
          `${horseName}'s championship mettle was tested today by ${rivalHorse.name}, and the answer was a resounding, emphatic victory.`,
          `The dream scenario played out for ${horseName}. A grudge match win against ${rivalHorse.name} on the path to a potential championship.`,
        );
      } else {
        bodies.push(
          `A devastating blow to ${horseName}'s championship aspirations. Losing to ${rivalHorse.name} in this grudge match raises serious questions about whether the title bid can survive.`,
          `The championship arc hangs by a thread after ${horseName} fell to ${rivalHorse.name}. This wasn't just a grudge match — it was a potential turning point in a career.`,
          `${horseName}'s legacy took a massive hit today. The grudge match loss to ${rivalHorse.name} is a catastrophic setback for the championship campaign.`,
          `The dream may be over. ${horseName} crumbled under the pressure of the grudge match, allowing ${rivalHorse.name} to strike a fatal blow to the title hopes.`,
          `A shocking defeat for ${horseName}. ${rivalHorse.name} played the ultimate spoiler in a grudge match that could define the season for all the wrong reasons.`,
          `${horseName}'s championship bid is now on life support after a stunningly poor performance against ${rivalHorse.name} in today's grudge match.`,
          `The pressure proved too much for ${horseName}. ${rivalHorse.name} exploited every weakness in a grudge match that leaves the championship campaign in tatters.`,
          `${horseName} faltered when it mattered most. The grudge match loss to ${rivalHorse.name} is a bitter pill to swallow for a horse with such high expectations.`,
          `The narrative has flipped entirely. ${horseName} is now fighting just to stay relevant after a disastrous grudge match showing against ${rivalHorse.name}.`,
          `${rivalHorse.name} didn't just win a grudge match; they may have ended ${horseName}'s championship aspirations entirely. A devastating result.`,
          `The road to the championship just got infinitely steeper for ${horseName} following a humbling grudge match defeat at the hands of ${rivalHorse.name}.`,
          `Questions will undoubtedly swirl around ${horseName}'s ability to win the big one after folding against ${rivalHorse.name} in this crucial grudge match.`,
          `It's a worst-case scenario for ${horseName}. The grudge match loss to ${rivalHorse.name} leaves the stable scrambling to salvage the season.`,
          `${horseName}'s aura of invincibility was shattered today by ${rivalHorse.name} in a grudge match that completely alters the championship picture.`,
        );
      }
    } else if (arcStage === "contender") {
      if (playerWon) {
        bodies.push(
          `${horseName}'s contender status was validated in the fire of this grudge match. Beating ${rivalHorse.name} proves the horse has the mettle for the biggest stages.`,
          `A huge leap forward for ${horseName}. Dispatching ${rivalHorse.name} in a grudge match confirms they are a legitimate threat to the top tier.`,
          `${horseName} answered the call today. The grudge match victory over ${rivalHorse.name} cements their place among the serious contenders.`,
          `The contender has arrived. ${horseName} put on a clinic against ${rivalHorse.name} in a grudge match that puts the whole division on notice.`,
          `${horseName} showed immense growth today, handling the pressure of a grudge match against ${rivalHorse.name} with the poise of a seasoned champion.`,
          `This is what contenders do. ${horseName} stepped up and delivered a knockout blow to ${rivalHorse.name} in a fiercely contested grudge match.`,
          `${horseName}'s rising profile got another massive boost with a statement grudge match win over rival ${rivalHorse.name}.`,
          `The transition from prospect to contender is complete. ${horseName}'s grudge match victory against ${rivalHorse.name} leaves no doubt.`,
          `${horseName} refused to be denied, securing a gutsy grudge match win over ${rivalHorse.name} that screams 'contender'.`,
          `A signature win for ${horseName}. Beating ${rivalHorse.name} in this grudge match is the highlight of an already impressive campaign.`,
          `${horseName} proved they belong at the top table, thoroughly outclassing ${rivalHorse.name} in today's high-stakes grudge match.`,
          `The momentum is undeniable. ${horseName} continues to surge after a dominant grudge match performance against ${rivalHorse.name}.`,
          `${horseName} laid down a marker today. The grudge match victory over ${rivalHorse.name} proves they are ready for anyone.`,
          `A massive confidence builder for ${horseName}. Taking down ${rivalHorse.name} in a grudge match validates all the stable's hard work.`,
        );
      } else {
        bodies.push(
          `A setback for ${horseName}'s contender campaign. Losing to ${rivalHorse.name} in this grudge match will test the horse's resilience and the stable's confidence.`,
          `${horseName}'s progression hit a speed bump today. The grudge match loss to ${rivalHorse.name} raises questions about their readiness for the elite level.`,
          `A harsh lesson for ${horseName}. ${rivalHorse.name} exposed some flaws in a grudge match that sends the contender back to the drawing board.`,
          `The hype train derailed slightly as ${horseName} failed to fire against ${rivalHorse.name} in a crucial grudge match.`,
          `${horseName} looked outmatched today. The grudge match loss to ${rivalHorse.name} suggests the jump to contender status might be premature.`,
          `A disappointing result for ${horseName}, who was expected to make a statement against ${rivalHorse.name} in today's grudge match.`,
          `${horseName}'s momentum has stalled. The grudge match defeat to ${rivalHorse.name} is a significant blow to their rising profile.`,
          `It's a gut check moment for ${horseName}. How they respond to this grudge match loss against ${rivalHorse.name} will define their season.`,
          `${rivalHorse.name} provided a reality check for ${horseName}, easily handling the supposed contender in today's grudge match.`,
          `${horseName} wilted under the pressure of the rivalry, surrendering a vital grudge match to ${rivalHorse.name}.`,
          `The contender status of ${horseName} is now in doubt after a lackluster showing against ${rivalHorse.name} in the grudge match.`,
          `A frustrating step backward for ${horseName}. The grudge match loss to ${rivalHorse.name} undoes much of the recent progress.`,
          `${horseName} was found wanting today, heavily beaten by ${rivalHorse.name} in a grudge match that highlights the gap to the top tier.`,
          `The stable has plenty of work to do. ${horseName}'s grudge match defeat to ${rivalHorse.name} shows they are not yet the finished article.`,
        );
      }
    } else if (arcStage === "rising_star") {
      if (playerWon) {
        bodies.push(
          `Rising star ${horseName} passed the grudge match test with flying colors. Beating ${rivalHorse.name} confirms the hype is real and the trajectory is still pointing up.`,
          `The future is now. Young ${horseName} showed incredible maturity to defeat ${rivalHorse.name} in a high-pressure grudge match.`,
          `${horseName} is a star in the making. The grudge match victory over ${rivalHorse.name} is a massive milestone in a promising career.`,
          `A brilliant performance from the young ${horseName}, who made light work of ${rivalHorse.name} in today's grudge match.`,
          `${horseName} continues to impress. The grudge match win against ${rivalHorse.name} proves this rising star is the real deal.`,
          `The potential is limitless. ${horseName} effortlessly handled ${rivalHorse.name} in a grudge match that further fuels the hype.`,
          `${horseName} is ahead of schedule. Dominating ${rivalHorse.name} in a grudge match suggests this young horse is ready for bigger challenges.`,
          `A statement win for the prodigy. ${horseName}'s grudge match victory over ${rivalHorse.name} puts the entire racing world on notice.`,
          `${horseName} showed no fear today, taking the fight to ${rivalHorse.name} and emerging victorious in a thrilling grudge match.`,
          `The sky is the limit for ${horseName}. Beating ${rivalHorse.name} in a grudge match is just the beginning for this rising star.`,
          `${horseName} handled the pressure of the rivalry perfectly, securing a grudge match win over ${rivalHorse.name} that highlights their immense talent.`,
          `A flawless display from ${horseName}. The young star completely outclassed ${rivalHorse.name} in today's grudge match.`,
          `${horseName}'s star continues to rise after a dominant, eye-catching grudge match victory against ${rivalHorse.name}.`,
          `The buzz around ${horseName} is justified. The grudge match win against ${rivalHorse.name} confirms we are watching something special.`,
        );
      } else {
        bodies.push(
          `A reality check for rising star ${horseName}. ${rivalHorse.name} proved too tough in this grudge match, but how the young horse responds will define the career arc.`,
          `The inexperience showed today as ${horseName} was outmaneuvered by ${rivalHorse.name} in a tough grudge match.`,
          `A valuable learning experience for ${horseName}. The grudge match loss to ${rivalHorse.name} highlights areas for improvement for the young star.`,
          `${horseName} found the pressure of the rivalry too much, succumbing to ${rivalHorse.name} in today's grudge match.`,
          `The hype train was slowed today as ${horseName} struggled to match ${rivalHorse.name} in a crucial grudge match.`,
          `A bump in the road for ${horseName}. The grudge match defeat to ${rivalHorse.name} shows the young horse still has a lot to learn.`,
          `${horseName} looked somewhat green today, easily handled by ${rivalHorse.name} in a grudge match that serves as a harsh lesson.`,
          `It's a minor setback for ${horseName}. The grudge match loss to ${rivalHorse.name} shouldn't overshadow the immense potential still there.`,
          `${rivalHorse.name} taught ${horseName} a lesson in race craft today, handing the rising star a humbling grudge match defeat.`,
          `${horseName} failed to fire in the grudge match, easily beaten by ${rivalHorse.name} in a performance that temper expectations slightly.`,
          `The young ${horseName} was thrown in the deep end and struggled, losing the grudge match to a sharper ${rivalHorse.name}.`,
          `A tough day at the office for ${horseName}. The grudge match defeat to ${rivalHorse.name} is a reminder that potential must be realized on the track.`,
          `${horseName} was outclassed today, with ${rivalHorse.name} proving far too strong in a one-sided grudge match.`,
          `The stable will need to rebuild ${horseName}'s confidence after a bruising grudge match encounter with ${rivalHorse.name}.`,
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
 * Generate a stable intro news item for retroactive introductions.
 * @param stable
 * @param day
 * @param rng
 * @returns A NewsItem introducing the stable.
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
    `The ${country} Connection: ${stable.name}`,
    `Focus On: ${stable.name}`,
    `Unmasking ${stable.name}`,
    `The Rise of ${stable.name}`,
    `${stable.name} Steps Into the Light`,
    `Profiling the ${tier} Tier Contender: ${stable.name}`,
  ];

  headlines.push(
    `An Introduction to ${stable.name}`,
    `Behind the Gates at ${stable.name}`,
    `Scouting Report: ${stable.name}`,
    `The Story Behind ${stable.name}`,
    `${stable.name} Breaks Cover`,
    `What You Need to Know About ${stable.name}`,
    `Meeting the ${tier} Tier Challenge: ${stable.name}`,
    `The Ascendance of ${stable.name}`,
    `Under the Microscope: ${stable.name}`,
    `Who is Behind ${stable.name}?`,
    `A Primer on ${stable.name}`,
    `Tracking the Progress of ${stable.name}`,
  );

  const bodies = [
    `The foundation laid by ${stable.owner} in ${country} is bearing fruit. ${stable.name} has proven they belong in the ${tier} tier conversation. ${description}`,
    `It takes a lot to stand out in the ${tier} tier, but ${stable.name} is doing just that. Hailing from ${country}, ${stable.owner}'s strategy is paying off. ${description}`,
    `More and more insiders are talking about ${stable.name}. From their base in ${country}, ${stable.owner} is putting together a very interesting ${tier} tier campaign. ${description}`,
    `The ambitions of ${stable.name} are clear. The ${country}-based yard, steered by ${stable.owner}, is not here to make up numbers in the ${tier} tier. ${description}`,
    `You can't ignore the momentum behind ${stable.name}. The ${country} operation, built by ${stable.owner}, is a ${tier} tier force on the rise. ${description}`,
    `What ${stable.owner} has accomplished with ${stable.name} in ${country} is noteworthy. They're a ${tier} tier stable that commands attention. ${description}`,
    `Based in ${country}, ${stable.name} is operated by ${stable.owner}. ${description} As a ${tier} tier operation, they're a name worth remembering.`,
    `${stable.name}, led by ${stable.owner}, hails from ${country}. ${description} Their ${tier} tier status marks them as a serious player in the racing world.`,
    `From ${country} comes ${stable.name}, the brainchild of ${stable.owner}. ${description} This ${tier} tier stable is one to watch.`,
    `${stable.owner}'s ${stable.name} is a name that commands respect in ${country}. ${description} As a ${tier} tier operation, they mean business.`,
    `Operating out of ${country}, ${stable.name} under ${stable.owner} has built a growing reputation. ${description} Their ${tier} tier standing speaks for itself.`,
    `${stable.name} — ${stable.owner}'s pride and joy from ${country}. ${description} A ${tier} tier stable with ambitions to match.`,
    `The story of ${stable.name} is one of ambition and grit. Founded by ${stable.owner} in ${country}, ${description} Their ${tier} tier status cements their place among the racing elite.`,
    `In the competitive world of ${country} racing, ${stable.name} stands tall. ${stable.owner}'s operation is defined by ${description} A ${tier} tier stable through and through.`,
    `Racing fans in ${country} are well acquainted with ${stable.name}. Guided by ${stable.owner}, ${description} This ${tier} tier yard is stepping up its campaign.`,
    `A deeper dive into ${stable.name} reveals a meticulously run organization. ${stable.owner} has established a strong presence in ${country}. ${description} They compete at the ${tier} tier level.`,
    `The paddock chatter often turns to ${stable.name}. Originating from ${country} and managed by ${stable.owner}, ${description} They are proving to be a formidable ${tier} tier outfit.`,
    `Expectations are high for ${stable.name}. The ${country} based operation, overseen by ${stable.owner}, is gaining traction. ${description} As a ${tier} tier stable, they are not to be underestimated.`,
    `Stepping into the spotlight is ${stable.name}. ${stable.owner} has assembled an impressive string of runners in ${country}. ${description} Their ${tier} tier classification is well-earned.`,
    `The ${tier} tier ranks are heating up with the emergence of ${stable.name}. Representing ${country} under ${stable.owner}'s guidance, ${description} They are making their intentions clear.`,
  ];

  bodies.push(
    `With a strong base in ${country}, ${stable.name} continues to impress. Owner ${stable.owner} has ensured this ${tier} tier outfit is highly respected. ${description}`,
    `Racing fans are keeping a close eye on ${stable.name}. Established in ${country} by ${stable.owner}, they have solidified their ${tier} tier status. ${description}`,
    `If you have not heard of ${stable.name} yet, you will soon. ${stable.owner} has built a ${tier} tier contender out of ${country}. ${description}`,
    `The buzz around ${country} continues to center on ${stable.name}. Guided by ${stable.owner}, this ${tier} tier operation is making waves. ${description}`,
    `${stable.name} represents the best of ${country} racing culture. With ${stable.owner} at the helm, this ${tier} tier stable is turning heads. ${description}`,
    `A closer look at ${stable.name} reveals a meticulously run ${tier} tier stable. Operating out of ${country}, ${stable.owner} has crafted an organization defined by ${description}`,
  );

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
