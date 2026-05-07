import type { NarrativeEvent } from "@/services/narrative/commentaryGenerator";

/**
 * Narrative commentary templates
 * Extracted from narrativeService.ts for better organization
 */

export const BIOGRAPHICAL_TEMPLATES = [
  "The {coat} {gender} {horse}, by {sire} out of {dam},",
  "{horse}, the {coat} {gender} representing {stable},",
  "Watch {horse}, a progeny of {sire},",
  "The {stable} runner, {horse},",
  "From the famous {family} family, {horse}",
];

export const FRAGMENTS = {
  PREFIXES: [
    "Unbelievable!",
    "Look at this!",
    "Incredible action,",
    "Right now,",
    "Unfolding before our eyes,",
    "As expected,",
    "Surprisingly,",
    "A dramatic turn,",
    "Stay focused on the pack,",
  ],
};

export const EXPERT_INSIGHT_TEMPLATES = {
  POSITIVE_FORM: [
    "{horse} has been in sparkling form lately, looking to continue that today.",
    "Expect a big run from {horse} given their recent track record.",
    "Condition looks peak for {horse} as they load into the gates.",
    "The stable is buzzing about {horse}'s chances today.",
  ],
  NEGATIVE_FORM: [
    "{horse} has struggled to find their best stride in recent starts.",
    "Looking for a bounce-back performance today from {horse}.",
    "Questions about the current fitness of {horse} after that last outing.",
    "This field might be a bit too deep for {horse} today.",
  ],
  DISTANCE_FIT: [
    "This {distance}m trip is right in the wheelhouse for {horse}.",
    "{horse} is a specialist at this distance.",
    "The distance shouldn't be an issue for {horse} today.",
    "Historically, {horse} excels at exactly this trip.",
  ],
  NEW_DISTANCE: [
    "First time at {distance}m for {horse}, a real test of stamina.",
    "Testing the waters at this trip today with {horse}.",
    "Will {horse} see out the full {distance}m? We're about to find out.",
    "A major question mark over {horse} stepping up to this distance.",
  ],
};

export const TEMPLATES: Record<NarrativeEvent, string[]> = {
  START: [
    "And they're off in the {raceName}!",
    "The gates are open and they're away!",
    "A clean start for the field in this {raceClass}!",
    "They break cleanly from the gates at {trackName}!",
    "A perfect dispatch for the {raceClass}!",
  ],
  LEAD_CHANGE: [
    "{horse} takes the lead!",
    "{horse} moves to the front!",
    "{horse} has surged into the lead!",
    "New leader! It's {horse} taking control.",
    "{horse} stick's their nose in front!",
    "A bold move by {horse} to grab the initiative!",
    "{horse} is bossing the field now from the front!",
    "The {stable} runner {horse} has found the lead!",
  ],
  SURGE: [
    "{horse} is making a move!",
    "{horse} is finding another gear!",
    "Watch {horse} go! They're gaining ground fast.",
    "{horse} is picking up the pace!",
    "{horse} is accelerating through the field!",
    "The {coat} {gender} {horse} is really starting to motor!",
    "{horse} is weaving through traffic like they're standing still!",
    "{horse} finds a gap on the rail and explodes through!",
    "Going around the outside, it's {horse} flying!",
  ],
  FADE: [
    "{horse} is starting to tire.",
    "{horse} is losing ground.",
    "{horse} is dropping back now.",
    "{horse} can't keep up with this pace.",
    "The early effort is telling on {horse}.",
    "{horse} looks to be hitting a wall here.",
    "{horse} is being left behind as the pace quickens.",
    "Losing touch with the pack, {horse} is in trouble.",
  ],
  STRETCH: [
    "They're turning for home in the {raceName}!",
    "Into the final stretch!",
    "The wire is in sight!",
    "Final furlong! Who's got the legs?",
    "Down the stretch they come!",
    "It's a battle to the wire!",
    "The crowd is on its feet as they hit the straight!",
    "Ears pinned back, they're sprinting for home!",
  ],
  FINISH: [
    "{horse} wins it!",
    "It's {horse} at the wire!",
    "{horse} takes the victory!",
    "A brilliant finish for {horse}!",
    "What a performance by {horse} to take the {raceName}!",
    "He's done it! {horse} is the winner!",
    "A photo finish! But {horse} looks to have it!",
  ],
  POSITION_CHECK: [
    "{horse} is running well in {rank}.",
    "In {rank} place, it's {horse}.",
    "{horse} holds steady in {rank}.",
    "{horse} is currently in {rank}.",
    "Tracking the leaders in {rank} is {horse}.",
    "{horse} is biding their time in {rank}.",
  ],
  DRAFTING: [
    "{horse} is tucked in behind {other}, saving ground.",
    "{horse} finds a nice slipstream behind {other}.",
    "Smart riding by {horse}, drafting behind {other}.",
    "{horse} is biding their time in the pocket.",
    "Conserving energy, {horse} is glued to the back of {other}.",
  ],
  HOT_PACE: [
    "The pace is scorching early on!",
    "They're really flying out there!",
    "A very hot pace being set by the front-runners.",
    "Front-runners are battling hard for the lead.",
    "They're going at a suicidal clip in front!",
  ],
  WEATHER_COMMENT: [
    "The {weather} conditions might favor the stayers today.",
    "It's a {weather} day at the track, surface is {trackCondition}.",
    "The track is {trackCondition}, which will test their mettle.",
    "Conditions are perfect for a fast time today.",
  ],
  STABLE_WATCH: [
    "Keep an eye on the {stable} runner, {horse}.",
    "{stable} will be hoping for a big run from {horse} here.",
    "{horse} carrying the famous {stable} colors.",
    "The {stable} team looks confident with {horse} today.",
  ],
  MILESTONE: [
    "Passing the halfway point now.",
    "Only {remaining}m to go in the {raceName}.",
    "They've got {remaining}m left to find a winner.",
    "Entering the final 400 meters!",
    "They're inside the final 100! Who wants it more?",
  ],
  EXPERT_INSIGHT: [],
  GAP_ANNOUNCEMENT: [
    "{horse} is leading by {lengths} lengths!",
    "{horse} has a {lengths} length advantage at the front.",
    "{horse} is pulling away! The gap is now {lengths} lengths.",
    "A dominant display from {horse}, clear by {lengths}!",
  ],
  ATMOSPHERE: [
    "The roar of the crowd is deafening!",
    "A tense atmosphere here at {trackName}.",
    "The anticipation is palpable as they round the turn.",
    "Every jockey is looking for that winning opening.",
  ],
  LANE_WATCH: [
    "{horse} is caught wide on the turn, covering a lot of extra ground!",
    "Looking for the rail, but {horse} is trapped out three-wide.",
    "A tough trip for {horse}, parked out wide without cover.",
    "The jockey on {horse} is trying to tuck in, but the rail is packed.",
  ],
};
