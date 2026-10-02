/**
 * raceAdvisor.ts — In-game, rule-based race strategy advisor. Reads a horse's
 * stats, aptitudes, running style, form history and the race conditions and
 * rival field, then recommends jockey instructions with reasoning and risks.
 * Fully deterministic; no external services.
 */
import type { Horse } from "@/game/types";
import type { Race } from "@/core/race/types";
import type { EarlyPosition, MoveTiming, RidingStyle, JockeyInstructions } from "./tacticsTypes";
import { getHorseTendencyStats } from "@/core/horse/paceTendency";

export interface RaceAdvice {
  ridingStyle: RidingStyle;
  earlyPosition: EarlyPosition;
  moveTiming: MoveTiming;
  aggressiveness: number;
  confidence: number; // 0-100
  outlook: "strong" | "competitive" | "outsider";
  reasons: string[];
  risks: string[];
  jockeyNotes: string;
  fieldEarlySpeed: number; // count of rivals likely to go forward
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function rating(h: Horse): number {
  const s = h.stats;
  return (s.speed + s.stamina + s.acceleration) / 3;
}

function isForward(h: Horse): boolean {
  return h.runningStyle === "E" || h.runningStyle === "EP";
}

export function adviseRace(horse: Horse, race: Race, rivals: Horse[]): RaceAdvice {
  const reasons: string[] = [];
  const risks: string[] = [];
  const s = horse.stats;
  const dist = race.distance;
  const surface = race.surface ?? race.graded?.surface;
  const wet = race.weather === "rainy";

  // --- Pace scenario ---
  const fieldEarlySpeed = rivals.filter(isForward).length;
  const hotPace = fieldEarlySpeed >= 3;
  const lonePace = fieldEarlySpeed === 0;

  // --- Horse profile ---
  const history = getHorseTendencyStats(horse);
  let natural: RidingStyle =
    horse.runningStyle === "E"
      ? "front_runner"
      : horse.runningStyle === "EP"
        ? "stalker"
        : horse.runningStyle === "P"
          ? "tactical"
          : "closer";
  if (history.sample >= 3 && history.dominant) {
    const bestTendency = (["front", "mid", "off"] as const).reduce((a, b) =>
      history.counts[b] && history.itm[b] / history.counts[b] > (history.counts[a] ? history.itm[a] / history.counts[a] : -1) ? b : a,
    );
    const fromHistory: RidingStyle =
      bestTendency === "front" ? "front_runner" : bestTendency === "mid" ? "stalker" : "closer";
    if (fromHistory !== natural) {
      reasons.push(`Form book shows its best placings when ridden ${bestTendency === "mid" ? "mid-pack" : bestTendency === "front" ? "on the pace" : "from behind"} (${history.sample} starts).`);
      natural = fromHistory;
    }
  }

  let style = natural;
  if (natural === "front_runner" && hotPace && s.stamina < 70) {
    style = "stalker";
    reasons.push(`${fieldEarlySpeed} rivals want the lead — sit just off a likely speed duel instead of burning out.`);
  } else if (lonePace && (natural === "stalker" || natural === "tactical") && s.speed >= 60) {
    style = "front_runner";
    reasons.push("No other early speed in the field — take the free lead and control the pace.");
  } else if (natural === "closer" && lonePace) {
    risks.push("Slow pace expected — closers can find the leader gone clear. Don't leave it too late.");
  } else if (natural === "closer" && hotPace) {
    reasons.push("Contested early pace should set this up for a late run.");
  }

  // Distance vs stamina
  if (dist >= 2200 && s.stamina < 60) {
    risks.push(`Stamina (${Math.round(s.stamina)}) is light for ${dist}m — conserve early.`);
    if (style === "front_runner") style = "stalker";
  } else if (dist >= 2200 && s.stamina >= 75) {
    reasons.push(`Strong stamina (${Math.round(s.stamina)}) suits the ${dist}m trip — can sustain a long run.`);
  }
  if (dist <= 1400 && s.acceleration >= 70) {
    reasons.push(`Quick acceleration (${Math.round(s.acceleration)}) is a weapon in a ${dist}m sprint.`);
  } else if (dist <= 1400 && style === "closer") {
    risks.push("Sprints give closers little time to make up ground.");
  }

  // Aptitudes
  if (surface) {
    const apt = horse.surfaceAptitude?.[surface] ?? 50;
    if (apt >= 70) reasons.push(`Proven liking for ${surface} (aptitude ${Math.round(apt)}).`);
    else if (apt < 45) risks.push(`${surface} is not its preferred surface (aptitude ${Math.round(apt)}).`);
  }
  if (wet) {
    if (horse.weatherPreference === "wet" || horse.mudAptitude >= 65) reasons.push("Rain is forecast and this horse handles wet going.");
    else if (horse.weatherPreference === "dry" || horse.mudAptitude < 40) risks.push("Wet going forecast — this horse prefers it dry and may lose focus.");
  } else if (race.weather && horse.weatherPreference === "wet") {
    risks.push("Dry conditions expected; it performs best with some cut in the ground.");
  }
  if (race.handedness && horse.trackPreference !== "balanced" && race.handedness !== "balanced") {
    if (race.handedness === horse.trackPreference) reasons.push(`Suits the ${race.handedness}-handed track.`);
    else risks.push(`Prefers ${horse.trackPreference}-handed tracks; this one turns ${race.handedness}.`);
  }
  if (s.temperament < 45) risks.push("Temperament is fragile — avoid a rough, crowded trip.");

  // Condition
  const fresh = horse.lastRaceDay != null ? race.day - horse.lastRaceDay : 99;
  if (fresh < 14) risks.push(`Only ${fresh} days since last run — may not be fully recovered.`);
  if (horse.recoveryPoints < 60) risks.push(`Condition is ${Math.round(horse.recoveryPoints)}/100.`);

  // --- Field strength ---
  const mine = rating(horse);
  const rivalRatings = rivals.map(rating).sort((a, b) => b - a);
  const better = rivalRatings.filter((r) => r > mine + 2).length;
  const top = rivalRatings[0] ?? 0;
  const outlook: RaceAdvice["outlook"] = better === 0 ? "strong" : better <= 2 ? "competitive" : "outsider";
  if (outlook === "strong") reasons.push("Rates as the best horse on paper in this field.");
  else if (outlook === "outsider") risks.push(`${better} rivals rate higher on paper (top rival ~${Math.round(top)} vs ${Math.round(mine)}).`);

  // --- Instructions ---
  const earlyPosition: EarlyPosition =
    style === "front_runner" ? (hotPace ? "press" : "lead") : style === "stalker" ? "press" : style === "tactical" ? "midpack" : "drop_back";
  let moveTiming: MoveTiming = style === "closer" ? "late" : style === "front_runner" ? "early" : "mid";
  if (dist >= 2200 && s.stamina >= 75 && style !== "front_runner") moveTiming = "mid";
  if (dist <= 1200 && style === "closer") moveTiming = "mid";

  let aggressiveness = 50;
  if (outlook === "outsider") aggressiveness += 15; // need to take a chance
  if (outlook === "strong") aggressiveness -= 10; // ride with confidence, avoid trouble
  if (hotPace && style === "front_runner") aggressiveness += 10;
  if (s.temperament < 45) aggressiveness -= 10;
  if (dist >= 2400) aggressiveness -= 10;
  aggressiveness = clamp(Math.round(aggressiveness), 10, 90);

  const confidence = clamp(Math.round(40 + reasons.length * 8 - risks.length * 7 + (outlook === "strong" ? 15 : outlook === "outsider" ? -10 : 0)), 5, 95);

  const posText: Record<EarlyPosition, string> = {
    lead: "Break sharply and take the lead",
    press: "Break well and sit on the leader's shoulder",
    midpack: "Settle mid-pack with cover",
    drop_back: "Drop in and settle towards the rear",
  };
  const moveText: Record<MoveTiming, string> = {
    early: "keep pressing from the 800m and dare them to catch you",
    mid: "improve position from the 600m and kick at the 400m",
    late: "wait until the straight, then swing wide for a clear run",
  };
  const jockeyNotes = `${posText[earlyPosition]}; ${moveText[moveTiming]}.${wet && horse.mudAptitude < 40 ? " Keep it balanced on the soft ground." : ""}`;

  return { ridingStyle: style, earlyPosition, moveTiming, aggressiveness, confidence, outlook, reasons, risks, jockeyNotes, fieldEarlySpeed };
}

export function adviceToInstructions(advice: RaceAdvice, horseId: string, raceId: string): JockeyInstructions {
  return {
    horseId,
    raceId,
    ridingStyle: advice.ridingStyle,
    earlyPosition: advice.earlyPosition,
    moveTiming: advice.moveTiming,
    aggressiveness: advice.aggressiveness,
    notes: advice.jockeyNotes,
  };
}
