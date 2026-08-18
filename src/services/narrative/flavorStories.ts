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
    {
      headline: "Starting Gate Upgrades Completed",
      body: "The track has unveiled a new, state-of-the-art starting gate, designed with extra padding and quieter mechanisms to keep fractious horses calmer before the break.",
      category: "flavor",
    },
    {
      headline: "New Grandstand Menu A Hit",
      body: "The newly revamped culinary offerings at the clubhouse are receiving rave reviews from patrons, with the signature trackside sandwich selling out before the fifth race.",
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
    {
      headline: "Veteran Rider Hits Career Milestone",
      body: "The grandstand erupted in applause today as one of the circuit's most respected journeyman riders secured their 2,000th career victory in a thrilling stretch duel.",
      category: "flavor",
    },
    {
      headline: "Suspensions Shake Up Rider Standings",
      body: "A flurry of recent careless riding suspensions has created an opening at the top of the jockey standings, leaving several eager riders scrambling for mounts.",
      category: "flavor",
    },
    {
      headline: "New Agent in Town Turns Heads",
      body: "A highly regarded jockey's agent has set up shop on the backstretch, immediately securing top mounts for their riders and disrupting established relationships.",
      category: "flavor",
    },
    {
      headline: "Riders Complain About Track Surface",
      body: "Following yesterday's card, several prominent riders voiced concerns to track management regarding an uneven bias that developed along the rail during the late afternoon.",
      category: "flavor",
    },
    {
      headline: "Weight Room Renovations Unveiled",
      body: "The local jockey colony is celebrating the completion of their newly expanded quarters, featuring upgraded saunas and recovery equipment to help riders manage their weight.",
      category: "flavor",
    },
    {
      headline: "Veteran Rider Mentors Rising Star",
      body: "A multiple stakes-winning rider was seen walking the turf course with this year's leading apprentice, pointing out the subtle intricacies of navigating the final turn.",
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
    {
      headline: "First Crop Sires Generating Buzz",
      body: "The early reports are in from the training centers, and whispers are growing that this year's freshman crop of sires might be one of the most precocious in recent memory.",
      category: "flavor",
    },
    {
      headline: "Major Farm Announces Stallion Roster",
      body: "One of the region's leading breeding operations unveiled their stud fees for the upcoming season, reflecting a sharp increase in demand for proven turf sires.",
      category: "flavor",
    },
    {
      headline: "First Foal by Champion Sire Arrives",
      body: "Excitement is building at a premier farm as the highly anticipated first foal from last year's Horse of the Year was born early this morning, described as a leggy, energetic colt.",
      category: "flavor",
    },
    {
      headline: "Broodmare Sale Breaks Records",
      body: "The fall mixed sale concluded with surprisingly strong returns, driven largely by intense bidding wars over a handful of deeply pedigreed mares in foal to top stallions.",
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
    {
      headline: "Sweltering Heat Forces Post Time Changes",
      body: "Track officials have announced a shift to evening racing for the remainder of the week to protect the equine athletes from the ongoing record-breaking heatwave.",
      category: "flavor",
    },
    {
      headline: "Fog Rolls In During Morning Works",
      body: "A thick blanket of fog covered the backstretch this morning, making it nearly impossible for clockers to record official workout times for the early sets.",
      category: "flavor",
    },
    {
      headline: "Unexpected Cold Snap Shivers Backstretch",
      body: "Plummeting temperatures overnight have trainers scrambling for extra blankets, while morning workouts have been delayed until the track surface properly thaws.",
      category: "flavor",
    },
    {
      headline: "High Winds Challenge Turf Runners",
      body: "Gusty crosswinds are expected for the afternoon card, leading several top trainers to reconsider tactics for their late-running turf specialists.",
      category: "flavor",
    },
    {
      headline: "Unseasonal Rain Washes Out Morning Works",
      body: "A sudden torrential downpour left the main track sealed and muddy, forcing most trainers to cancel their scheduled breeze assignments and stick to walking the shedrow.",
      category: "flavor",
    },
    {
      headline: "Perfect Conditions Forecast for Stakes Weekend",
      body: "Meteorologists are predicting crisp, clear weather with low humidity for the upcoming festival, promising a fast dirt track and firm going on the turf.",
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
    {
      headline: "Annual Track Picnic A Huge Success",
      body: "The backstretch community came together for the annual summer barbecue, enjoying a rare afternoon of relaxation before the demanding weekend racing schedule begins.",
      category: "flavor",
    },
    {
      headline: "Local School Visits Backstretch",
      body: "A group of elementary school students enjoyed a guided tour of the stables this morning, feeding peppermints to the horses and learning about the daily life of a thoroughbred.",
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
    {
      headline: "International Buyers Arrive for Yearling Sale",
      body: "The airport was busy this week as prominent bloodstock agents from around the globe arrived to inspect the latest crop of yearlings ahead of the premier auction.",
      category: "flavor",
    },
    {
      headline: "New Veterinary Research Published",
      body: "A leading equine clinic has published a groundbreaking study on soft tissue recovery, offering trainers new insights into managing minor aches and pains in their runners.",
      category: "flavor",
    },
  ],
};

export const ALL_FLAVOR_STORIES: readonly FlavorStory[] = Object.values(FLAVOR_STORIES).flat();
