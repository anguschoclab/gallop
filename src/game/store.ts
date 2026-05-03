import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GameState, Horse, Race, Pregnancy } from "./types";
import { generateHorse, generateRace, horsePrice, makeGradedRace } from "./horseGen";
import { GRADED_RACES } from "./gradedRaces";
import { beyerFigure, distanceBucket, setCalibratedPars } from "./beyer";

const PRIZE_SPLIT = [0.6, 0.25, 0.1, 0.05];
const UPKEEP_PER_HORSE = 50;
const TRAINING_SLOTS_PER_DAY = 2;
const STARTING_CASH = 5000;
const BREEDING_FEE = 2000;
const GESTATION_DAYS = 30;
const SEASON_DAYS = 30;
const MAX_SAMPLES_PER_BUCKET = 60;

// Get race history limit from localStorage, default to 50
function getRaceHistoryLimit(): number {
  const saved = localStorage.getItem("raceHistoryLimit");
  if (saved) {
    const limit = parseInt(saved, 10);
    if ([10, 20, 50].includes(limit)) return limit;
  }
  return 50;
}

// Recompute par-time per distance bucket from collected winner finish times.
// Uses a slightly-faster-than-median (40th percentile) to match the
// "above-average winner" intent of Beyer par.
function recomputePars(samples: Record<number, number[]>): Record<number, number> {
  const out: Record<number, number> = {};
  for (const [k, arr] of Object.entries(samples)) {
    if (arr.length < 3) continue;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.4);
    out[Number(k)] = sorted[idx];
  }
  return out;
}

type Actions = {
  newGame: () => void;
  trainHorse: (horseId: string, kind: "speed" | "stamina" | "acceleration" | "rest") => void;
  buyHorse: (horseId: string) => void;
  enterRace: (raceId: string, horseId: string) => void;
  withdrawRace: (raceId: string, horseId: string) => void;
  resolveRace: (raceId: string, result: { horseId: string; position: number; time: number }[]) => void;
  breed: (sireId: string, damId: string) => void;
  advanceDay: () => void;
};

function initialState(): GameState {
  const horses: Horse[] = [
    { ...generateHorse({ tier: "starter", owned: true }) },
    { ...generateHorse({ tier: "starter", owned: true }) },
  ];
  const market: Horse[] = Array.from({ length: 5 }, () => generateHorse({ tier: Math.random() < 0.6 ? "budget" : "mid" }));
  const races: Race[] = [];
  for (let d = 1; d <= 7; d++) {
    const count = Math.random() < 0.7 ? 2 : 3;
    for (let i = 0; i < count; i++) races.push(generateRace(d));
  }
  // Schedule the full first year of real graded stakes
  for (const g of GRADED_RACES) {
    races.push(makeGradedRace(g, g.dayOfYear));
  }
  return {
    day: 1,
    cash: STARTING_CASH,
    horses,
    market,
    races,
    trainingUsed: {},
    log: [{ day: 1, text: "Welcome to your stable. Train your horses and enter them in races!" }],
    pregnancies: [],
  };
}

export const useGame = create<GameState & Actions>()(
  persist(
    (set, get) => ({
      ...initialState(),

      newGame: () => set({ ...initialState() }),

      trainHorse: (horseId, kind) => {
        const s = get();
        const horse = s.horses.find((h) => h.id === horseId);
        if (!horse) return;
        if (s.pregnancies.some((p) => !p.resolved && p.damId === horseId)) return;
        const used = s.trainingUsed[horseId] ?? 0;
        if (used >= TRAINING_SLOTS_PER_DAY) return;
        if (kind === "rest") {
          horse.energy = Math.min(100, horse.energy + 30);
        } else {
          const cost = 75;
          if (s.cash < cost) return;
          if (horse.energy < 15) return;
          horse.energy = Math.max(0, horse.energy - 18);
          // gain chance
          const stat = horse.stats[kind];
          const gap = horse.potential - stat;
          if (gap > 0 && Math.random() < 0.65) {
            const gain = Math.min(gap, Math.random() < 0.2 ? 2 : 1);
            horse.stats[kind] = Math.min(horse.potential, stat + gain);
          }
          s.cash -= cost;
        }
        set({
          horses: [...s.horses],
          cash: s.cash,
          trainingUsed: { ...s.trainingUsed, [horseId]: used + 1 },
        });
      },

      buyHorse: (horseId) => {
        const s = get();
        const h = s.market.find((m) => m.id === horseId);
        if (!h) return;
        const price = horsePrice(h);
        if (s.cash < price) return;
        const bought: Horse = { ...h, owned: true };
        set({
          cash: s.cash - price,
          horses: [...s.horses, bought],
          market: s.market.filter((m) => m.id !== horseId),
          log: [{ day: s.day, text: `Bought ${h.name} for $${price.toLocaleString()}.` }, ...s.log].slice(0, 50),
        });
      },

      enterRace: (raceId, horseId) => {
        const s = get();
        const race = s.races.find((r) => r.id === raceId);
        const horse = s.horses.find((h) => h.id === horseId);
        if (!race || !horse) return;
        if (s.pregnancies.some((p) => !p.resolved && p.damId === horseId)) return;
        if (race.resolved) return;
        if (s.cash < race.entryFee) return;
        if (race.entries.some((e) => e.horseId === horseId)) return;
        if (race.entries.length >= race.fieldSize) return;
        const r = race.restrictions;
        if (r) {
          // Check hemisphere-specific age restrictions first
          const minAgeToCheck = horse.hemisphere === "Northern" 
            ? (r.minAgeNorthern ?? r.minAge) 
            : (r.minAgeSouthern ?? r.minAge);
          if (minAgeToCheck !== undefined && horse.age < minAgeToCheck) return;
          if (r.maxAge !== undefined && horse.age > r.maxAge) return;
        }
        race.entries.push({ horseId, owned: true });
        set({
          races: [...s.races],
          cash: s.cash - race.entryFee,
          log: [{ day: s.day, text: `Entered ${horse.name} in ${race.name}.` }, ...s.log].slice(0, 50),
        });
      },

      withdrawRace: (raceId, horseId) => {
        const s = get();
        const race = s.races.find((r) => r.id === raceId);
        if (!race || race.resolved) return;
        race.entries = race.entries.filter((e) => e.horseId !== horseId);
        set({ races: [...s.races], cash: s.cash + Math.floor(race.entryFee / 2) });
      },

      resolveRace: (raceId, result) => {
        const s = get();
        const race = s.races.find((r) => r.id === raceId);
        if (!race || race.resolved) return;
        race.resolved = true;
        race.result = result;
        let earned = 0;
        const classBonus = race.graded?.grade === "G1" ? 8 : race.graded?.grade === "G2" ? 5 : race.graded?.grade === "G3" ? 3 : race.raceClass === "Group" ? 4 : race.raceClass === "Stakes" ? 2 : 0;
        for (const r of result) {
          const h = s.horses.find((hh) => hh.id === r.horseId);
          if (!h) continue;
          h.energy = Math.max(0, h.energy - 25);
          const beyer = beyerFigure({ distance: race.distance, finishTime: r.time, classBonus });
          h.raceHistory = [{ raceId, raceName: race.name, position: r.position, day: s.day, beyer, grade: race.graded?.grade, distance: race.distance, surface: race.graded?.surface, purse: race.purse, fieldSize: result.length }, ...h.raceHistory].slice(0, getRaceHistoryLimit());
          // form change
          if (r.position === 1) h.form = Math.min(10, h.form + 3);
          else if (r.position <= 3) h.form = Math.min(10, h.form + 1);
          else h.form = Math.max(-10, h.form - 1);
          // payout
          if (r.position <= PRIZE_SPLIT.length) {
            earned += Math.round(race.purse * PRIZE_SPLIT[r.position - 1]);
          }
        }
        const ownerResults = result.filter((r) => s.horses.some((h) => h.id === r.horseId));
        const summary = ownerResults
          .map((r) => {
            const h = s.horses.find((hh) => hh.id === r.horseId)!;
            return `${h.name}: ${r.position}${ord(r.position)}`;
          })
          .join(", ");
        // Record winner finish time into pace samples for this distance bucket.
        const samples: Record<number, number[]> = { ...(s.paceSamples ?? {}) };
        const winner = result.find((r) => r.position === 1);
        if (winner && isFinite(winner.time) && winner.time > 0) {
          const b = distanceBucket(race.distance);
          const arr = [...(samples[b] ?? []), winner.time];
          if (arr.length > MAX_SAMPLES_PER_BUCKET) arr.splice(0, arr.length - MAX_SAMPLES_PER_BUCKET);
          samples[b] = arr;
        }
        set({
          races: [...s.races],
          horses: [...s.horses],
          cash: s.cash + earned,
          paceSamples: samples,
          log: [
            { day: s.day, text: `${race.name} — ${summary}${earned ? ` (won $${earned.toLocaleString()})` : ""}` },
            ...s.log,
          ].slice(0, 50),
        });
      },

      breed: (sireId, damId) => {
        const s = get();
        if (sireId === damId) return;
        const sire = s.horses.find((h) => h.id === sireId);
        const dam = s.horses.find((h) => h.id === damId);
        if (!sire || !dam) return;
        if (s.cash < BREEDING_FEE) return;
        const dueDay = s.day + GESTATION_DAYS;
        const preg: Pregnancy = {
          id: Math.random().toString(36).slice(2, 10),
          sireId, damId,
          sireName: sire.name, damName: dam.name,
          conceivedDay: s.day,
          dueDay,
          resolved: false,
        };
        set({
          cash: s.cash - BREEDING_FEE,
          pregnancies: [preg, ...s.pregnancies],
          log: [
            { day: s.day, text: `🐴 Mated ${sire.name} × ${dam.name} (foal due day ${dueDay}). Fee $${BREEDING_FEE.toLocaleString()}.` },
            ...s.log,
          ].slice(0, 50),
        });
      },

      advanceDay: () => {
        const s = get();
        // auto-resolve any unresolved races scheduled for current day with no owned entries
        for (const race of s.races) {
          if (race.resolved) continue;
          if (race.day > s.day) continue;
          // skip if owned horse entered (player must run them via UI; but if missed, auto-resolve as DNS)
          race.resolved = true;
          race.result = [];
        }
        // upkeep
        const upkeep = s.horses.length * UPKEEP_PER_HORSE;
        // restore energy
        const horses = s.horses.map((h) => ({ ...h, energy: Math.min(100, h.energy + 35) }));
        // refresh market: remove 1-2 oldest, add new
        let market = [...s.market];
        if (market.length > 3) market = market.slice(2);
        while (market.length < 5) {
          const r = Math.random();
          const tier = r < 0.5 ? "budget" : r < 0.85 ? "mid" : "elite";
          market.push(generateHorse({ tier: tier as never }));
        }
        // add new races 7 days out
        const races = [...s.races];
        const newDay = s.day + 1;
        const futureDay = newDay + 6;
        const count = Math.random() < 0.7 ? 2 : 3;
        for (let i = 0; i < count; i++) races.push(generateRace(futureDay));
        // Top up real graded stakes whose dayOfYear falls in the upcoming 7-day window
        for (let offset = 1; offset <= 7; offset++) {
          const fday = newDay + offset;
          const dY = ((fday - 1) % 365) + 1;
          for (const g of GRADED_RACES) {
            if (g.dayOfYear !== dY) continue;
            if (races.some((r) => r.graded?.key === g.key && r.day === fday)) continue;
            races.push(makeGradedRace(g, fday));
          }
        }
        // prune ancient resolved races
        const pruned = races.filter((r) => r.day >= newDay - 3);

        // resolve births
        const newLogs: { day: number; text: string }[] = [];
        const pregnancies = s.pregnancies.map((p) => ({ ...p }));
        let foals: Horse[] = [];
        for (const p of pregnancies) {
          if (p.resolved) continue;
          if (newDay < p.dueDay) continue;
          const sire = s.horses.find((h) => h.id === p.sireId);
          const dam = s.horses.find((h) => h.id === p.damId);
          const foal = generateHorse({ tier: "starter", owned: true });
          foal.age = 0;
          foal.sireName = p.sireName;
          foal.damName = p.damName;
          if (sire && dam) {
            foal.stats = {
              speed: Math.round((sire.stats.speed + dam.stats.speed) / 2 + (Math.random() * 10 - 5)),
              stamina: Math.round((sire.stats.stamina + dam.stats.stamina) / 2 + (Math.random() * 10 - 5)),
              acceleration: Math.round((sire.stats.acceleration + dam.stats.acceleration) / 2 + (Math.random() * 10 - 5)),
              consistency: Math.round((sire.stats.consistency + dam.stats.consistency) / 2 + (Math.random() * 10 - 5)),
            };
            foal.potential = Math.min(100, Math.round((sire.potential + dam.potential) / 2 + (Math.random() * 8 - 2)));
          }
          p.resolved = true;
          p.foalId = foal.id;
          foals.push(foal);
          newLogs.push({ day: newDay, text: `🍼 Foal born: ${foal.name} (by ${p.sireName} out of ${p.damName}).` });
        }

        // Seasonal Beyer par recalibration from collected pace samples.
        let calibratedPars = s.calibratedPars;
        let lastCalibrationDay = s.lastCalibrationDay ?? 0;
        const seasonLog: { day: number; text: string }[] = [];
        if (newDay - lastCalibrationDay >= SEASON_DAYS) {
          const recomputed = recomputePars(s.paceSamples ?? {});
          if (Object.keys(recomputed).length > 0) {
            calibratedPars = recomputed;
            setCalibratedPars(recomputed);
            lastCalibrationDay = newDay;
            const buckets = Object.keys(recomputed).length;
            seasonLog.push({ day: newDay, text: `📊 Beyer par recalibrated from ${buckets} distance bucket${buckets === 1 ? "" : "s"}.` });
          }
        }

        set({
          day: newDay,
          cash: s.cash - upkeep,
          horses: [...horses, ...foals],
          market,
          races: pruned,
          trainingUsed: {},
          pregnancies,
          calibratedPars,
          lastCalibrationDay,
          log: [...seasonLog, ...newLogs, { day: newDay, text: `Day ${newDay} begins. Upkeep: $${upkeep}.` }, ...s.log].slice(0, 50),
        });
      },
    }),
    {
      name: "horse-racing-game-v1",
      onRehydrateStorage: () => (state) => {
        if (state?.calibratedPars) setCalibratedPars(state.calibratedPars);
      },
    }
  )
);

function ord(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
