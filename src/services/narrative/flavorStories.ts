import type { NewsCategory } from "@/services/narrative/newsTypes";

export interface FlavorStory {
  headline: string;
  body: string;
  category: NewsCategory;
}

export type FlavorStoryTheme =
  "track" | "jockeys" | "breeding" | "weather" | "community" | "industry";

export const FLAVOR_STORIES: Record<FlavorStoryTheme, FlavorStory[]> = {
  track: [
    {
      headline: "Local Track Upgrades Completed",
      body: "Track officials have announced the completion of several key infrastructure projects, promising a better experience for both fans and equine athletes.",
      category: "flavor",
    },
    {
      headline: "Track Attendance Figures Up",
      body: "A recent marketing push seems to be paying off, with weekend attendance numbers showing a healthy year-over-year increase across major venues.",
      category: "flavor",
    },
    {
      headline: "Turf Course Under Maintenance",
      body: "Groundskeepers are taking advantage of a brief gap in the schedule to aerate and re-seed sections of the turf course ahead of the major stakes weekend.",
      category: "flavor",
    },
    {
      headline: "Historic Attendance Numbers Expected",
      body: "Ticket sales are surging ahead of the upcoming festival weekend, with organizers preparing for what could be a record-breaking crowd.",
      category: "flavor",
    },
    {
      headline: "Debate Over Artificial Surfaces Reignites",
      body: "A recent symposium on equine safety has once again sparked heated debates among trainers regarding the merits of synthetic racing surfaces.",
      category: "flavor",
    },
    {
      headline: "Track Management Promises Increased Purses",
      body: "Following a successful betting season, track administrators have committed to bumping up the purse structures for several upcoming mid-level allowance races.",
      category: "flavor",
    },
    {
      headline: "Old Grandstand Gets Historic Designation",
      body: "The local heritage society has officially recognized the track's original wooden grandstand, securing funds for its much-needed restoration.",
      category: "flavor",
    },
    {
      headline: "Equipment Malfunction Delays Workouts",
      body: "Morning training was briefly halted when the starting gate tractor broke down, leaving several eager colts waiting patiently on the track.",
      category: "flavor",
    },
    {
      headline: "Track Kitchen Introduces New Menu",
      body: "The famous backstretch diner has revamped its breakfast offerings, sparking lively debate among grooms and hotwalkers over the new coffee blend.",
      category: "flavor",
    },
  ],
  jockeys: [
    {
      headline: "Jockey Colony Sees Influx of Talent",
      body: "Several promising young riders have transferred their tack to the local circuit, raising the level of competition in the jockeys' room.",
      category: "flavor",
    },
    {
      headline: "Apprentice Riders Join the Circuit",
      body: "A wave of promising apprentice riders has arrived on the circuit this week, eager to make their mark and challenge the established veterans.",
      category: "flavor",
    },
  ],
  breeding: [
    {
      headline: "Historical Sire Line Resurging",
      body: "Bloodstock analysts are noting an unexpected revival of a classic sire line that had seemingly fallen out of favor over the past decade.",
      category: "flavor",
    },
    {
      headline: "Equine Nutrition Breakthrough",
      body: "Researchers at a leading veterinary college have published new findings on racehorse diets, prompting many top trainers to adjust their feed programs.",
      category: "flavor",
    },
    {
      headline: "Equine Nutrition Seminar Draws Crowds",
      body: "Top veterinary experts gathered today to discuss the latest advancements in racing diets, emphasizing customized nutrition plans for peak performance.",
      category: "flavor",
    },
    {
      headline: "Veterinary Conference Concludes",
      body: "Leading equine practitioners wrapped up their annual summit today, highlighting new advancements in regenerative therapies for soft tissue injuries.",
      category: "flavor",
    },
  ],
  weather: [
    {
      headline: "Weather Alert: Clear Skies Ahead",
      body: "The regional meteorological bureau predicts ideal racing conditions for the next several days, with fast dirt and firm turf expected across most tracks.",
      category: "flavor",
    },
    {
      headline: "Heavy Rains Threaten Turf Schedule",
      body: "An unexpected storm system moving into the region has track superintendents working overtime to ensure the turf course remains safe for competition.",
      category: "flavor",
    },
  ],
  community: [
    {
      headline: "Trainer Milestone Approaching",
      body: "A veteran of the local training ranks is quietly approaching their 1000th career victory, drawing praise from peers across the backstretch.",
      category: "flavor",
    },
    {
      headline: "Charity Auction a Resounding Success",
      body: "The annual racing community charity gala raised unprecedented funds last night, with a silent auction featuring historic racing memorabilia.",
      category: "flavor",
    },
    {
      headline: "Famed Announcer Announces Retirement",
      body: "After three decades of calling the races, the beloved voice of the local track has confirmed this season will be their last in the booth.",
      category: "flavor",
    },
    {
      headline: "Fashion on the Field Draws Attention",
      body: "The annual race day fashion contest brought an array of colorful outfits to the grandstand, proving the sport remains a major social event.",
      category: "flavor",
    },
    {
      headline: "Local Blacksmith Celebrates Half-Century",
      body: "The backstretch threw a surprise party for a beloved farrier who has been shoeing champions at this track for exactly fifty years.",
      category: "flavor",
    },
    {
      headline: "Unusual Mascot Spotted in Paddock",
      body: "A prominent stable has adopted a stray goat as a companion for their top sprinter, claiming the unlikely friendship keeps the horse calm before big races.",
      category: "flavor",
    },
    {
      headline: "Amateur Photography Contest Winners Announced",
      body: "The racing club revealed the winning photos from this year's fan contest, featuring stunning morning workout silhouettes and dramatic finish-line action.",
      category: "flavor",
    },
    {
      headline: "Morning Line Oddsmaker Retires",
      body: "The track's long-time oddsmaker has announced their retirement after three decades of setting the morning lines for the local racing circuit.",
      category: "flavor",
    },
    {
      headline: "Rivalry Brews Among Outriders",
      body: "A friendly but fierce competition has developed between the track's outriders over who has the most impressive pony horse this season.",
      category: "flavor",
    },
  ],
  industry: [
    {
      headline: "New Season Projections",
      body: "Pundits are already weighing in on the upcoming stakes schedule, with many predicting a highly competitive year for the 3-year-old division.",
      category: "flavor",
    },
    {
      headline: "Debate Over Whip Rules Continues",
      body: "The racing commission's latest meeting saw heated arguments regarding potential new restrictions on crop usage during the final furlong.",
      category: "flavor",
    },
    {
      headline: "New Syndicate Enters the Fray",
      body: "A deep-pocketed ownership group has officially registered their silks, signaling their intent to make a splash at the upcoming yearling sales.",
      category: "flavor",
    },
    {
      headline: "Auction Catalog Drops",
      body: "The highly anticipated catalog for next month's premier sale has been released online, sending bloodstock agents scrambling to do their homework.",
      category: "flavor",
    },
    {
      headline: "New Quarantine Protocols Implemented",
      body: "In a proactive measure, racing authorities have introduced stricter travel guidelines for horses shipping in from out of state to ensure equine health.",
      category: "flavor",
    },
  ],
};

export const ALL_FLAVOR_STORIES: readonly FlavorStory[] = Object.values(FLAVOR_STORIES).flat();
