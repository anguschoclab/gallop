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
      headline: "Local Turf Course Earns Praise",
      body: "Following extensive off-season renovations, visiting jockeys have universally praised the condition and bounce of the newly laid turf course.",
      category: "flavor",
    },
    {
      headline: "Grandstand Roof Repairs Completed Ahead of Schedule",
      body: "Track officials are breathing a sigh of relief as major structural repairs to the historic grandstand roof wrapped up just in time for the spring meet.",
      category: "flavor",
    },
    {
      headline: "Track Implements New Drainage System",
      body: "A multi-million dollar investment in a state-of-the-art subsurface drainage system promises to significantly reduce the number of off-the-turf races this season.",
      category: "flavor",
    },
    {
      headline: "Vintage Winner's Circle Restored",
      body: "A local historical society has successfully completed the restoration of the track's original 1920s winner's circle, returning a touch of classic elegance to the venue.",
      category: "flavor",
    },
    {
      headline: "Paddock Expansion Project Announced",
      body: "To accommodate growing crowds and provide better viewing angles for fans, management has unveiled plans to significantly expand the saddling paddock area next year.",
      category: "flavor",
    },
    {
      headline: "Backstretch Beautification Project Underway",
      body: "Volunteers and track employees have teamed up to plant hundreds of new flowers around the paddock and walking rings, adding fresh color to the venue.",
      category: "flavor",
    },
    {
      headline: "Starting Gate Overhauled",
      body: "Track maintenance crews worked through the night to perform a major overhaul on the starting gate, replacing old padding and recalibrating the magnetic release mechanisms.",
      category: "flavor",
    },
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
    {
      headline: "Winner's Circle Gets a Facelift",
      body: "A local landscaping firm has completely redesigned the winner's circle with exotic floral arrangements ahead of the major stakes weekend.",
      category: "flavor",
    },
    {
      headline: "New Luxury VIP Area Opens",
      body: "Track officials cut the ribbon on a high-end spectator pavilion today, offering premium dining and private betting terminals for the elite crowd.",
      category: "flavor",
    },
    {
      headline: "Local Artist Commissions Equine Mural",
      body: "A massive, vibrant mural depicting historic race finishes was unveiled along the grandstand concourse, much to the delight of visiting racing fans.",
      category: "flavor",
    },
    {
      headline: "Major Brand Secures Track Sponsorship",
      body: "A popular beverage company has signed a lucrative deal to sponsor the paddock area, bringing new signage and promotional events to the daily card.",
      category: "flavor",
    },
  ],
  jockeys: [
    {
      headline: "Journeyman Jockey Hits 2000 Wins",
      body: "A popular local rider reached a major career milestone yesterday, steering a longshot to victory to notch their 2000th career win to a massive ovation.",
      category: "flavor",
    },
    {
      headline: "Apprentice Rider Making Waves",
      body: "A bug boy fresh out of jockey school has taken the colony by storm, riding three winners on Saturday's card and catching the eye of major stables.",
      category: "flavor",
    },
    {
      headline: "Jockey Colony Welcomes International Talent",
      body: "The jockey room has a new face this week as a highly touted rider from overseas has shifted their tack locally for the remainder of the season.",
      category: "flavor",
    },
    {
      headline: "Veteran Rider Announces Final Season",
      body: "One of the most respected names in the irons has confirmed this will be their farewell tour, prompting tributes from trainers and fellow riders alike.",
      category: "flavor",
    },
    {
      headline: "Rider Suspended for Careless Riding",
      body: "The stewards have handed down a stiff three-day suspension to a leading jockey following an inquiry into interference during yesterday's feature race.",
      category: "flavor",
    },
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
      headline: "Leading Rider Sidelined by Injury",
      body: "The current leader in the jockey standings is expected to miss at least three weeks after a minor spill during morning workouts.",
      category: "flavor",
    },
    {
      headline: "New Whip Design Tested in Races",
      body: "Several riders are experimenting with a newly approved, padded riding crop designed to meet stricter welfare regulations without sacrificing encouragement.",
      category: "flavor",
    },
    {
      headline: "Jockey Masterclass Draws Young Talent",
      body: "A retired Hall of Fame rider hosted a clinic on pace-setting this morning, drawing a large group of eager apprentices.",
      category: "flavor",
    },
    {
      headline: "Rider Achieves Rare Five-Win Day",
      body: "A prominent journeyman jockey dominated the afternoon card, booting home five winners and leaving the rest of the colony struggling to keep up.",
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
    {
      headline: "Sibling Rivalry on the Track",
      body: "The jockey colony is buzzing as two talented siblings prepare to ride against each other for the first time in a major stakes race today.",
      category: "flavor",
    },
    {
      headline: "Veteran Takes Apprentice Under Their Wing",
      body: "One of the circuit's oldest and wisest riders has been spotted walking the track each morning, passing down decades of knowledge to a promising bug boy.",
      category: "flavor",
    },
    {
      headline: "New Diet Fad Sweeps the Jockeys' Room",
      body: "Riders have been trading tips on a controversial new intermittent fasting routine, all in desperate bids to make weight before the weekend action.",
      category: "flavor",
    },
    {
      headline: "Prominent Rider Hits Dry Spell",
      body: "Questions are swirling in the paddock as one of the track's leading riders endures a shocking 0-for-20 slump over the past two weeks.",
      category: "flavor",
    },
  ],
  breeding: [
    {
      headline: "First Foals from Champion Sire Turn Heads",
      body: "The first crop of yearlings by a recently retired Horse of the Year are hitting the sales grounds, and bloodstock agents are raving about their conformation and scope.",
      category: "flavor",
    },
    {
      headline: "Historic Farm Changes Hands",
      body: "One of the region's oldest and most prestigious breeding operations has been quietly acquired by an international conglomerate looking to expand its footprint.",
      category: "flavor",
    },
    {
      headline: "Demand Surges for Speed Sire Lines",
      body: "Early sales results indicate a massive shift in buyer preference, with precocious, speed-oriented pedigrees commanding massive premiums over stamina lines.",
      category: "flavor",
    },
    {
      headline: "Broodmare of the Year Announced",
      body: "A remarkable mare whose progeny captured three Grade 1 races this season has been overwhelmingly voted Broodmare of the Year by the breeders' association.",
      category: "flavor",
    },
    {
      headline: "Syndicate Forms Around Promising Two-Year-Old",
      body: "Before he's even completed his juvenile campaign, a high-profile ownership group has already secured the future breeding rights to an undefeated sensation.",
      category: "flavor",
    },
    {
      headline: "Prominent Mare Delivers Healthy Twins",
      body: "In a rare and closely watched event, a multiple stakes-winning mare has safely delivered healthy twin foals, defying the usual odds in thoroughbred reproduction.",
      category: "flavor",
    },
    {
      headline: "Stud Fee Adjustments Spark Debate",
      body: "A leading farm's decision to dramatically increase the stud fee of their marquee stallion has triggered intense discussions among breeders about market value and accessibility.",
      category: "flavor",
    },
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
      headline: "Surprise Demand at Yearling Sale",
      body: "Bidding wars broke out at the regional yearling sale today, with several relatively unknown sires seeing their progeny fetch unexpectedly high prices.",
      category: "flavor",
    },
    {
      headline: "Legacy Farm Changes Hands",
      body: "One of the oldest and most respected breeding operations in the region has been quietly sold to an international conglomerate, marking the end of an era.",
      category: "flavor",
    },
    {
      headline: "New Reproductive Tech Shows Promise",
      body: "A local fertility clinic presented preliminary data on a new technique that could significantly improve conception rates in older, hard-to-breed mares.",
      category: "flavor",
    },
    {
      headline: "Pinhooking Syndicate Reaps Rewards",
      body: "A group that purchased a batch of inexpensive weanlings last year made a massive return on investment today, selling them as two-year-olds in training.",
      category: "flavor",
    },
    {
      headline: "Broodmare of the Year Honored",
      body: "The local breeding association held a banquet last night to honor a legendary mare who has produced three graded stakes winners from just four foals.",
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
      headline: "Unseasonal Heat Wave Tests Horses",
      body: "Soaring temperatures have forced trainers to adjust their morning routines, sending horses out before dawn to beat the oppressive midday heat.",
      category: "flavor",
    },
    {
      headline: "Fog Delays Morning Works",
      body: "A thick blanket of fog settled over the track this morning, bringing workouts to a grinding halt as clockers were completely unable to see the backstretch.",
      category: "flavor",
    },
    {
      headline: "Rain Prompts Slew of Scratches",
      body: "A sudden and severe downpour has turned the main track sloppy, leading to a wave of scratches as trainers opt to save their runners for a dry day.",
      category: "flavor",
    },
    {
      headline: "High Winds Wreak Havoc in the Paddock",
      body: "Blustery conditions made saddling a nightmare today, with several highly strung horses getting visibly upset by the flapping flags and howling wind.",
      category: "flavor",
    },
    {
      headline: "Perfect Autumn Weather Boosts Attendance",
      body: "Crisp air and clear blue skies provided the perfect backdrop for a spectacular weekend of racing, drawing one of the largest on-track crowds of the season.",
      category: "flavor",
    },
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
      headline: "Autumn Chill Settles Over Track",
      body: "The distinct crispness of fall was in the air this morning, signaling to trainers that it's time to break out the heavy stable blankets.",
      category: "flavor",
    },
    {
      headline: "Sudden Downpour Causes Track Seal",
      body: "A pop-up thunderstorm forced the maintenance crew into action, quickly sealing the main track to prevent moisture from compromising the base.",
      category: "flavor",
    },
    {
      headline: "Perfect Spring Conditions Attract Crowds",
      body: "A break in the seasonal showers has delivered a picture-perfect afternoon, with fans flocking to the apron to enjoy the sunshine and fast conditions.",
      category: "flavor",
    },
    {
      headline: "Dry Spell Leads to Hard Track",
      body: "Weeks without significant rainfall have left the main track favoring early speed, prompting complaints from the connections of several deep closers.",
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
      headline: "Retired Champion Parades for Fans",
      body: "A fan-favorite gelding returned to the track for a special retirement parade between races, looking fit and happy as the crowd roared their appreciation.",
      category: "flavor",
    },
    {
      headline: "Local Artist Unveils Paddock Mural",
      body: "A stunning new mural depicting legendary local horses in full stride was officially unveiled in the walking ring, drawing admiration from horsemen and fans.",
      category: "flavor",
    },
    {
      headline: "Backstretch Clinic Receives Major Donation",
      body: "An anonymous benefactor has donated a significant sum to the backstretch medical clinic, ensuring vital healthcare services remain available to track workers.",
      category: "flavor",
    },
    {
      headline: "Trainer Hosts Open House for Fans",
      body: "In a bid to increase transparency and fan engagement, a prominent trainer opened their barn doors to the public for a morning of coffee, donuts, and horse petting.",
      category: "flavor",
    },
    {
      headline: "Tack Shop Celebrates 25 Years",
      body: "The iconic tack shop located just outside the track gates celebrated a quarter-century in business today, offering discounts and sharing stories of legendary customers.",
      category: "flavor",
    },
    {
      headline: "Local School Hosts Field Trip at the Track",
      body: "Hundreds of elementary school students visited the track this morning, getting a behind-the-scenes look at the barns and learning about equine care from local trainers.",
      category: "flavor",
    },
    {
      headline: "Veteran Groom Honored with Award",
      body: "A quiet but deeply respected groom received the annual 'Unsung Hero' award at this week's racing banquet, recognized for over forty years of dedicated service to the horses.",
      category: "flavor",
    },
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
      headline: "Backstretch Barbecue Tradition Continues",
      body: "The annual end-of-meet barbecue for track workers went off without a hitch last night, serving up legendary ribs and providing a much-needed break for the grooms and hotwalkers.",
      category: "flavor",
    },
    {
      headline: "Racing Club Welcomes New Members",
      body: "The local racing syndicate hosted an open house at the barns this morning, drawing an enthusiastic crowd of prospective owners eager to learn about the sport.",
      category: "flavor",
    },
    {
      headline: "Track Historian Publishes New Book",
      body: "A newly released book detailing the golden era of this circuit is flying off the shelves at the track gift shop, reviving memories of long-forgotten champions.",
      category: "flavor",
    },
    {
      headline: "School Visit Brings Smiles to the Paddock",
      body: "A group of elementary school children got a behind-the-scenes tour of the stables today, getting to feed carrots to a retired graded stakes winner.",
      category: "flavor",
    },
    {
      headline: "Grooms Recognized with Awards",
      body: "In a touching ceremony before the first race, several veteran grooms were honored for their decades of dedicated service to the equine athletes.",
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
      headline: "New Whip Restrictions Face Pushback",
      body: "The jockey guild has filed a formal grievance regarding the newly implemented restrictions on crop usage, arguing the rules are vague and compromise safety.",
      category: "flavor",
    },
    {
      headline: "Fractional Ownership Group Secures Major Sponsor",
      body: "A popular micro-share ownership syndicate has announced a lucrative partnership with a lifestyle brand, bringing mainstream corporate money into the sport.",
      category: "flavor",
    },
    {
      headline: "Racing Commission Investigates Medication Positive",
      body: "Rumors are swirling after the commission confirmed an ongoing investigation into a post-race positive test from a prominent runner, though no names have been released.",
      category: "flavor",
    },
    {
      headline: "Track Handle Hits Record High",
      body: "Buoyed by massive field sizes and competitive racing, the total wagering handle for the weekend festival shattered previous records, pleasing management and horsemen.",
      category: "flavor",
    },
    {
      headline: "New Veterinary Protocols Mandated",
      body: "In a sweeping move to improve equine welfare, the regulatory board has mandated more rigorous pre-race veterinary inspections for all graded stakes entries.",
      category: "flavor",
    },
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
      headline: "Off-Track Betting Revenues Spike",
      body: "The latest fiscal report shows a significant increase in simulcast and off-track wagering, providing a much-needed boost to the local racing economy.",
      category: "flavor",
    },
    {
      headline: "Proposed Track Relocation Draws Fire",
      body: "Rumors of a major developer offering to buy the historic track land have sparked protests from local racing fans and preservation societies.",
      category: "flavor",
    },
    {
      headline: "New Equine Drug Testing Lab Opens",
      body: "A state-of-the-art testing facility has officially opened its doors, promising faster turnaround times and more rigorous screening for banned substances.",
      category: "flavor",
    },
    {
      headline: "Racing Commission Announces Leadership Change",
      body: "Following a turbulent year, the regional racing authority has appointed a new commissioner known for a strict stance on safety regulations.",
      category: "flavor",
    },
    {
      headline: "Sponsorship Deal Brings New Series",
      body: "A major automotive manufacturer has signed a multi-year deal to sponsor a new series of stakes races aimed at older handicap horses.",
      category: "flavor",
    },
    {
      headline: "Investigative Report Rattles Industry",
      body: "A bombshell article in a leading sports journal detailing alleged irregularities at off-shore breeding operations has the industry on high alert.",
      category: "flavor",
    },
    {
      headline: "International Simulcast Agreement Reached",
      body: "Local tracks will now feature directly in several major overseas betting markets following a breakthrough agreement signed earlier this week.",
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
      headline: "Regulators Weigh Medication Changes",
      body: "The national governing body is circulating a memo about phasing out several race-day medications, sparking fierce debate among trainers and owners.",
      category: "flavor",
    },
    {
      headline: "Broadcasting Rights Deal Finalized",
      body: "A major sports network has secured the exclusive broadcasting rights for the upcoming summer circuit, promising unprecedented coverage of morning works and paddock activity.",
      category: "flavor",
    },
    {
      headline: "New Ownership App Launches",
      body: "A tech startup has introduced a fractional ownership app aiming to bring younger demographics into the sport, allowing fans to purchase micro-shares of racehorses.",
      category: "flavor",
    },
    {
      headline: "International Simulcast Agreement Signed",
      body: "Track officials have brokered a new simulcast deal, meaning local races will now be broadcast and wagered on in several major overseas markets.",
      category: "flavor",
    },
    {
      headline: "Task Force Formed on Aftercare",
      body: "Industry leaders announced a joint initiative with several major farms to better fund retirement and retraining programs for off-track thoroughbreds.",
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
