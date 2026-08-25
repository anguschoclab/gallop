import type { JockeyTrait } from "@/core/jockey/types";

export const JOCKEY_MOVE_TEMPLATES: string[] = [
  "{jockey} asks {horse} for an effort and gets an immediate response!",
  "{jockey} makes a decisive move on {horse} — timing it to perfection.",
  "A beautifully judged ride from {jockey} on {horse}.",
  "{jockey} gets to work on {horse}, asking for maximum effort now.",
  "Look at that switch from {jockey} — {horse} responds instantly!",
  "{jockey} is riding a patient race on {horse}, waiting for the right moment.",
  "A masterful tactical decision from {jockey} aboard {horse}.",
  "{jockey} angles {horse} out for a clear run — a smart piece of riding.",
  "Great hands from {jockey} — {horse} is travelling like a dream.",
  "{jockey} makes his move on {horse} — the jockey means business!",
  "A cool, calculated ride from {jockey} on {horse}.",
  "{jockey} gets {horse} into a lovely rhythm — that's expert horsemanship.",
  "The jockey {jockey} is getting a tune out of {horse} right now.",
  "{jockey} asks {horse} to quicken — and the response is immediate!",
  "A textbook ride from {jockey} — {horse} is perfectly positioned.",
  "{jockey} is squeezing every ounce of talent from {horse} today.",
];

export const JOCKEY_TACTIC_TEMPLATES: string[] = [
  "{jockey} is riding {horse} with patience, saving energy for one run.",
  "{jockey} has {horse} handy — that's a {jockeyArchetype} approach.",
  "Classic {jockeyArchetype} tactics from {jockey} on {horse}.",
  "{jockey} is bowling along on {horse}, dictating the tempo from the front.",
  "Settled in behind the leaders — {jockey} is playing the waiting game on {horse}.",
  "{jockey} is scrubbing along on {horse}, trying to stay in touch.",
  "That's textbook {jockeyArchetype} riding from {jockey} — {horse} is perfectly placed.",
  "{jockey} is conserving {horse}'s energy for the business end of the race.",
  "A patient, {jockeyArchetype} ride from {jockey} — {horse} is biding their time.",
  "{jockey} is making every post a winning post on {horse}.",
  "The {jockeyArchetype} instincts of {jockey} are showing on {horse}.",
  "{jockey} has {horse} switched off and relaxed — a lovely ride.",
  "Tactical awareness from {jockey} — {horse} is in the perfect spot.",
  "{jockey} is riding {horse} to their strengths — that's smart horsemanship.",
  "A front-running masterclass from {jockey} on {horse}.",
  "{jockey} is threading the needle on {horse} — finding gaps nobody else can.",
];

export const JOCKEY_MASTERY_TEMPLATES: string[] = [
  "World-class ride from {jockey} — timing that move to perfection!",
  "Champion jockey {jockey} is showing exactly why they're elite on {horse}.",
  "That's a Group 1-winning ride from {jockey} aboard {horse}.",
  "{jockey} is at the very top of their game — what a display on {horse}!",
  "Elite horsemanship from {jockey} — {horse} is responding brilliantly.",
  "When the pressure is on, {jockey} delivers — that's class on {horse}.",
  "{jockey} is riding with supreme confidence on {horse} — and it shows.",
  "A masterclass from {jockey} — {horse} is in the hands of a true artist.",
  "That's why {jockey} commands the big rides — {horse} is flying under them.",
  "{jockey} has {horse} travelling like a winner — pure class in the saddle.",
  "Big-race temperament from {jockey} — they never panic on {horse}.",
  "A ride of pure genius from {jockey} on {horse} — that's elite talent.",
];

export const JOCKEY_APPRENTICE_TEMPLATES: string[] = [
  "Apprentice {jockey} is taking full advantage of the claim allowance on {horse}.",
  "What a ride from apprentice {jockey} — {horse} is running for them!",
  "The 7lb claim is making a real difference — {jockey} and {horse} are flying.",
  "Apprentice {jockey} is showing maturity beyond their years on {horse}.",
  "A confident ride from the claimer {jockey} — {horse} is responding beautifully.",
  "Don't underestimate {jockey} — this apprentice is getting a tune out of {horse}.",
  "The weight allowance is proving crucial — {jockey} and {horse} are a perfect match.",
  "Apprentice {jockey} is making a name for themselves aboard {horse}.",
  "A star of the future — {jockey} is riding {horse} with real poise.",
  "That claim is worth its weight in gold — {jockey} has {horse} in contention.",
  "Apprentice {jockey} is showing no nerves on the big stage with {horse}.",
  "A polished ride from the young claimer {jockey} on {horse}.",
];

export const JOCKEY_TRAIT_TEMPLATES: Record<JockeyTrait, string[]> = {
  bullring_expert: [
    "{jockey} knows every inch of this tight track — {horse} is in expert hands.",
    "A bullring specialist, {jockey} is navigating {horse} through the tight bends with ease.",
    "{jockey} thrives on tight tracks like this — {horse} is perfectly handled.",
  ],
  hill_specialist: [
    "{jockey} is a hill specialist — {horse} is handling the gradients beautifully.",
    "The undulations suit {jockey} perfectly — {horse} is climbing with purpose.",
    "{jockey} knows how to ride a hill — {horse} is tackling the rises with confidence.",
  ],
  long_straight_pro: [
    "{jockey} is a long-straight specialist — {horse} is perfectly positioned for the run home.",
    "With that long home straight ahead, {jockey} is playing {horse}'s cards perfectly.",
    "{jockey} excels on tracks with long straights — {horse} is in the ideal position.",
  ],
  gate_master: [
    "{jockey} has {horse} out of the gates like a rocket — that's their specialty!",
    "A trademark fast start from gate master {jockey} — {horse} is away in front!",
    "{jockey} is renowned for their gate skills — {horse} broke like a bullet!",
  ],
  turf_specialist: [
    "{jockey} is a turf specialist — {horse} is relishing the grass underfoot.",
    "On the turf, {jockey} is in their element — {horse} is gliding over the ground.",
    "{jockey} knows exactly how to ride the turf — {horse} is travelling superbly.",
  ],
  dirt_specialist: [
    "{jockey} is a dirt specialist — {horse} is handling the surface perfectly.",
    "On the dirt, {jockey} is second to none — {horse} is flying along.",
    "{jockey} thrives on the dirt surface — {horse} is loving every stride.",
  ],
  mud_master: [
    "{jockey} is a mud master — {horse} is handling these conditions brilliantly!",
    "In the soft ground, {jockey} comes into their own — {horse} is relishing the going.",
    "{jockey} loves it when the mud is flying — {horse} is handling it with ease.",
  ],
  sprint_specialist: [
    "{jockey} is a sprint specialist — {horse} is showing blistering early speed.",
    "Over sprint distances, {jockey} is peerless — {horse} is flying out of the gates.",
    "{jockey} knows how to ride a sprint — {horse} is showing raw speed.",
  ],
  staying_specialist: [
    "{jockey} is a staying specialist — {horse} is settling in for the long haul.",
    "Over staying distances, {jockey} is the master — {horse} is pacing it beautifully.",
    "{jockey} excels at staying races — {horse} is conserving energy for the finish.",
  ],
  pace_presser: [
    "{jockey} is pressing the pace — {horse} is right on the heels of the leaders.",
    "A pace-pressing ride from {jockey} — {horse} is not letting the leader get away.",
    "{jockey} is putting the pressure on — {horse} is close enough to pounce.",
  ],
  big_match_temperament: [
    "In the big race, {jockey} is ice cool — {horse} is responding to their composure.",
    "{jockey} thrives on the big occasion — {horse} is rising to the challenge.",
    "When it matters most, {jockey} delivers — {horse} is in safe hands.",
  ],
  veteran_poise: [
    "Veteran {jockey} is riding with all their experience — {horse} is beautifully handled.",
    "Thousands of rides have taught {jockey} patience — {horse} is the beneficiary.",
    "{jockey}'s years of experience are showing — {horse} is in the perfect position.",
  ],
  closer_instinct: [
    "{jockey} has that closer's instinct — {horse} is winding up for the final assault.",
    "A trademark late run from {jockey} — {horse} is finishing like a train!",
    "{jockey} knows exactly when to pounce — {horse} is flying at the finish.",
  ],
};
