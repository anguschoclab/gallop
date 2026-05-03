import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { GameState, Horse, Race, Pregnancy } from "./types";
import { generateHorse, generateRace, horsePrice, makeGradedRace } from "./horseGen";
import { GRADED_RACES } from "./gradedRaces";
import { beyerFigure, distanceBucket, setCalibratedPars } from "./beyer";
import { loadRaceHistoryLimit } from "@/services/storageAdapter";
import { loadGameState, saveGameState } from "@/services/storageAdapter";
import { canBreed, type BreedResult } from "@/core/breeding/eligibility";
import { createRng, hashStr } from "./rng";
import { resolveFoaling } from "./foalGen";

export type ActionResult = { ok: true } | { ok: false, reason: string };

const PRIZE_SPLIT = [0.6, 0.25, 0.1, 0.05];
const UPKEEP_PER_HORSE = 50;
export const TRAINING_COST = 75;
const TRAINING_SLOTS_PER_DAY = 2;
const STARTING_CASH = 5000;
const BREEDING_FEE = 2000;
const LIVE_FOAL_GUARANTEE_FEE = 1000; // Additional fee for live foal guarantee
const GESTATION_DAYS = 30;
const SEASON_DAYS = 30;
const MAX_SAMPLES_PER_BUCKET = 60;

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
  enterRace: (raceId: string, horseId: string) => ActionResult;
  withdrawRace: (raceId: string, horseId: string) => void;
  resolveRace: (raceId: string, result: { horseId: string; position: number; time: number }[]) => void;
  breed: (sireId: string, damId: string, liveFoalGuarantee?: boolean) => ActionResult;
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

// Custom storage adapter for Zustand persist using OPFS
const opfsStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const state = await loadGameState();
    return state ? JSON.stringify(state) : null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    // Zustand persist passes a JSON string (when using createJSONStorage)
    // We need to parse it to get the state object, then save it
    try {
      const state = JSON.parse(value) as GameState;
      await saveGameState(state);
    } catch (error) {
      console.error('Failed to parse state in setItem:', error);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    // Clear game state - handled by storageAdapter
    await (await import('@/services/storageAdapter')).clearGameState();
  },
};

// Wrap with createJSONStorage for proper serialization
const jsonStorage = createJSONStorage(() => opfsStorage);

// Flag to track if hydration has completed
export let hydrationComplete = false;

export const useGame = create<GameState & Actions>()(
  persist(
    (set, get) => ({
      // Start with empty state, will be hydrated from storage
      day: 1,
      cash: STARTING_CASH,
      horses: [],
      market: [],
      races: [],
      trainingUsed: {},
      log: [],
      pregnancies: [],
      paceSamples: {},
      calibratedPars: {},
      lastCalibrationDay: 0,

      newGame: async () => {
        // Clear OPFS storage when starting a new game
        await (await import('@/services/storageAdapter')).clearGameState();
        set({ ...initialState() });
      },

      trainHorse: (horseId, kind) => {
        const s = get();
        const horse = s.horses.find((h) => h.id === horseId);
        if (!horse) return;
        if (s.pregnancies.some((p) => !p.resolved && p.damId === horseId)) return;
        // Check if horse has covering sickness - prevent training
        if (horse.healthStatus === "covering_sickness") {
          set({
            log: [
              { day: s.day, text: `❌ Training blocked: ${horse.name} has covering sickness (dourine). Horse cannot be trained while infected.` },
              ...s.log,
            ].slice(0, 50),
          });
          return;
        }
        const usedToday = s.trainingUsed[horseId] || 0;
        if (usedToday >= TRAINING_SLOTS_PER_DAY) return;
        if (horse.energy < 10) return;
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
          trainingUsed: { ...s.trainingUsed, [horseId]: usedToday + 1 },
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
        const fail = (reason: string): ActionResult => {
          set({ log: [{ day: s.day, text: `❌ Race entry: ${reason}` }, ...s.log].slice(0, 50) });
          return { ok: false, reason };
        };
        if (!race) return fail("Race not found.");
        if (!horse) return fail("Horse not found.");
        if (race.resolved) return fail("Race already resolved.");
        if (s.pregnancies.some((p) => !p.resolved && p.damId === horseId)) return fail(`${horse.name} is pregnant.`);
        if (race.entries.some((e) => e.horseId === horseId)) return fail(`${horse.name} is already entered.`);
        if (race.entries.length >= race.fieldSize) return fail("Race field is full.");
        // Economic guard: refuse races whose entry fee exceeds 50% of purse —
        // this catches misconfigured races and protects the player's bankroll.
        if (race.entryFee > race.purse * 0.5) return fail("Entry fee exceeds 50% of purse.");
        if (s.cash < race.entryFee) return fail("Insufficient cash for entry fee.");
        const r = race.restrictions;
        if (r) {
          const minAgeToCheck = horse.hemisphere === "Northern"
            ? (r.minAgeNorthern ?? r.minAge)
            : (r.minAgeSouthern ?? r.minAge);
          if (minAgeToCheck !== undefined && horse.age < minAgeToCheck) {
            return fail(`${horse.name} is below minimum age (${minAgeToCheck}).`);
          }
          if (r.maxAge !== undefined && horse.age > r.maxAge) {
            return fail(`${horse.name} is above maximum age (${r.maxAge}).`);
          }
        }
        race.entries.push({ horseId, owned: true });
        set({
          races: [...s.races],
          cash: s.cash - race.entryFee,
          log: [{ day: s.day, text: `Entered ${horse.name} in ${race.name}.` }, ...s.log].slice(0, 50),
        });
        return { ok: true };
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
        // Sanitize results: split into finishers vs DNFs (Infinity/NaN/<=0
        // finish time). DNFs keep their slot at the back of the field but
        // earn no purse and no Beyer.
        const tieRng = createRng(hashStr(race.id) ^ 0x7e57);
        const enriched = result.map((r) => ({ ...r, dnf: !Number.isFinite(r.time) || r.time <= 0 }));
        const finishers = enriched.filter((r) => !r.dnf).sort((a, b) => {
          if (a.time === b.time) return tieRng.next() - 0.5;
          return a.time - b.time;
        });
        const dnfs = enriched.filter((r) => r.dnf);
        const ranked = [
          ...finishers.map((r, idx) => ({ ...r, position: idx + 1 })),
          ...dnfs.map((r, idx) => ({ ...r, position: finishers.length + idx + 1 })),
        ];
        race.resolved = true;
        race.result = ranked.map(({ horseId, position, time }) => ({ horseId, position, time }));

        // Detect photo finish (any pair of finishers within 0.05s).
        let photoFinish = false;
        for (let i = 1; i < finishers.length; i++) {
          if (Math.abs(finishers[i].time - finishers[i - 1].time) < 0.05) {
            photoFinish = true;
            break;
          }
        }

        let earned = 0;
        const classBonus = race.graded?.grade === "G1" ? 8 : race.graded?.grade === "G2" ? 5 : race.graded?.grade === "G3" ? 3 : race.raceClass === "Group" ? 4 : race.raceClass === "Stakes" ? 2 : 0;
        // Compute payouts up front so we can guarantee splits sum to purse.
        const finisherCount = finishers.length;
        const splits: number[] = [];
        let runningPaid = 0;
        for (let i = 0; i < Math.min(PRIZE_SPLIT.length, finisherCount); i++) {
          const pay = Math.round(race.purse * PRIZE_SPLIT[i]);
          splits.push(pay);
          runningPaid += pay;
        }
        // Route any unpaid remainder (rounding or unfilled places) to the
        // last paid finisher rather than silently dropping it.
        if (splits.length > 0 && runningPaid < race.purse && finisherCount >= PRIZE_SPLIT.length) {
          splits[splits.length - 1] += race.purse - runningPaid;
        }

        for (const r of ranked) {
          const h = s.horses.find((hh) => hh.id === r.horseId);
          if (!h) continue;
          h.energy = Math.max(0, h.energy - 25); // Racing costs 25 energy
          const beyer = r.dnf ? 0 : beyerFigure({ distance: race.distance, finishTime: r.time, classBonus });
          h.raceHistory = [{ raceId, raceName: race.name, position: r.position, day: s.day, beyer, grade: race.graded?.grade, distance: race.distance, surface: race.graded?.surface, purse: race.purse, fieldSize: ranked.length }, ...h.raceHistory].slice(0, loadRaceHistoryLimit());
          // form change (DNF treated as "did not finish" → mild form penalty)
          if (r.dnf) h.form = Math.max(-10, h.form - 1);
          else if (r.position === 1) h.form = Math.min(10, h.form + 3);
          else if (r.position <= 3) h.form = Math.min(10, h.form + 1);
          else h.form = Math.max(-10, h.form - 1);
          // payout
          if (!r.dnf && r.position - 1 < splits.length) {
            earned += splits[r.position - 1];
          }
          // Update dam's blue hen status if horse wins a stakes race.
          // Initialize the dam's record on demand if it didn't exist —
          // counters start at 0 and increment from this win, fixing the
          // earlier bug where stakesWinnersProduced was set to 1 at foal birth.
          if (!r.dnf && r.position === 1 && (race.graded || race.raceClass === "Stakes" || race.raceClass === "Group")) {
            const dam = s.horses.find((hh) => hh.name === h.damName);
            if (dam) {
              if (!dam.blueHenStatus) {
                dam.blueHenStatus = {
                  isBlueHen: false,
                  stakesWinnersProduced: 0,
                  group1WinnersProduced: 0,
                  blueHenScore: 0,
                  foalsProduced: dam.foalsProduced?.length ?? 0,
                };
              }
              dam.blueHenStatus.stakesWinnersProduced += 1;
              if (race.graded?.grade === "G1") {
                dam.blueHenStatus.group1WinnersProduced += 1;
              }
              const baseScore = Math.min(dam.blueHenStatus.stakesWinnersProduced * 15, 60);
              const g1Bonus = dam.blueHenStatus.group1WinnersProduced * 20;
              dam.blueHenStatus.blueHenScore = Math.min(baseScore + g1Bonus, 100);
              if (dam.blueHenStatus.stakesWinnersProduced >= 2 || dam.blueHenStatus.group1WinnersProduced >= 1) {
                dam.blueHenStatus.isBlueHen = true;
              }
            }
          }
        }
        const ownerResults = ranked.filter((r) => s.horses.some((h) => h.id === r.horseId));
        const summary = ownerResults
          .map((r) => {
            const h = s.horses.find((hh) => hh.id === r.horseId)!;
            return `${h.name}: ${r.dnf ? "DNF" : `${r.position}${ord(r.position)}`}`;
          })
          .join(", ");
        // Record winner finish time into pace samples for this distance bucket.
        const samples: Record<number, number[]> = { ...(s.paceSamples ?? {}) };
        const winner = finishers[0];
        if (winner && isFinite(winner.time) && winner.time > 0) {
          const b = distanceBucket(race.distance);
          const arr = [...(samples[b] ?? []), winner.time];
          if (arr.length > MAX_SAMPLES_PER_BUCKET) arr.splice(0, arr.length - MAX_SAMPLES_PER_BUCKET);
          samples[b] = arr;
        }
        const photoNote = photoFinish ? " 📸 Photo finish!" : "";
        set({
          races: [...s.races],
          horses: [...s.horses],
          cash: s.cash + earned,
          paceSamples: samples,
          log: [
            { day: s.day, text: `${race.name} — ${summary}${earned ? ` (won $${earned.toLocaleString()})` : ""}${photoNote}` },
            ...s.log,
          ].slice(0, 50),
        });
      },

      breed: (sireId, damId, liveFoalGuarantee = false) => {
        const s = get();
        const sire = s.horses.find((h) => h.id === sireId);
        const dam = s.horses.find((h) => h.id === damId);
        const fail = (reason: string): ActionResult => {
          set({ log: [{ day: s.day, text: `❌ Breeding: ${reason}` }, ...s.log].slice(0, 50) });
          return { ok: false, reason };
        };

        const eligibility: BreedResult = canBreed(sire, dam, s.day, s.pregnancies);
        if (!eligibility.ok) return fail(eligibility.reason);

        const totalFee = BREEDING_FEE + (liveFoalGuarantee ? LIVE_FOAL_GUARANTEE_FEE : 0);
        if (s.cash < totalFee) return fail("Insufficient cash for breeding fee.");

        const dueDay = s.day + GESTATION_DAYS;
        const preg: Pregnancy = {
          id: crypto.randomUUID(),
          sireId, damId,
          sireName: sire!.name, damName: dam!.name,
          conceivedDay: s.day,
          dueDay,
          resolved: false,
          liveFoalGuarantee,
          reBreedingAttempts: 0,
          refunded: false,
        };
        set({
          cash: s.cash - totalFee,
          pregnancies: [preg, ...s.pregnancies],
          log: [
            { day: s.day, text: `🐴 Mated ${sire!.name} × ${dam!.name} (foal due day ${dueDay}). Fee $${totalFee.toLocaleString()}${liveFoalGuarantee ? " (Live Foal Guarantee)" : ""}.` },
            ...s.log,
          ].slice(0, 50),
        });
        return { ok: true };
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
        // Track per-dam mutations on a working copy of the existing horses
        // array (which already had energy restored above) so blue-hen / foal-id
        // updates land on the persisted set, not on the pre-energy-restore set.
        const damsById = new Map(horses.map((h) => [h.id, h]));
        const foals: Horse[] = [];
        let cashAdjustment = 0;
        for (const p of pregnancies) {
          if (p.resolved) continue;
          if (newDay < p.dueDay) continue;
          const sire = damsById.get(p.sireId);
          const dam = damsById.get(p.damId);

          const outcome = resolveFoaling(p, sire, dam);

          if (outcome.kind === "live") {
            const foal = outcome.foal;
            if (dam) {
              if (!dam.blueHenStatus) {
                dam.blueHenStatus = {
                  isBlueHen: false,
                  stakesWinnersProduced: 0,
                  group1WinnersProduced: 0,
                  blueHenScore: 0,
                  foalsProduced: 0,
                };
              }
              dam.blueHenStatus.foalsProduced = (dam.blueHenStatus.foalsProduced || 0) + 1;
              const baseScore = Math.min(dam.blueHenStatus.stakesWinnersProduced * 15, 60);
              const g1Bonus = dam.blueHenStatus.group1WinnersProduced * 20;
              dam.blueHenStatus.blueHenScore = Math.min(baseScore + g1Bonus, 100);
              if (dam.blueHenStatus.stakesWinnersProduced >= 2 || dam.blueHenStatus.group1WinnersProduced >= 1) {
                dam.blueHenStatus.isBlueHen = true;
              }
              if (!dam.foalsProduced) dam.foalsProduced = [];
              dam.foalsProduced.push(foal.id);
              dam.lastFoaledDay = newDay;
            }
            p.resolved = true;
            p.foalId = foal.id;
            foals.push(foal);

            if (outcome.transmission) {
              foal.healthStatus = "covering_sickness";
              foal.healthStatusDay = newDay;
              newLogs.push({ day: newDay, text: `🍼 Foal born: ${foal.name} (by ${p.sireName} out of ${p.damName}). ⚠️ Covering sickness detected.` });
            } else {
              newLogs.push({ day: newDay, text: `🍼 Foal born: ${foal.name} (by ${p.sireName} out of ${p.damName}).` });
            }
          } else {
            // Live Foal Guarantee: refund exactly once per pregnancy. The
            // `refunded` flag prevents double-payment if a re-bred attempt
            // also fails (each attempt is fully covered by the original fee).
            const canRefund = p.liveFoalGuarantee && !p.refunded;
            const canRetry = p.liveFoalGuarantee && (p.reBreedingAttempts || 0) < 3;
            if (canRetry) {
              if (canRefund) {
                cashAdjustment += BREEDING_FEE + LIVE_FOAL_GUARANTEE_FEE;
                p.refunded = true;
              }
              p.resolved = false;
              p.dueDay = newDay + GESTATION_DAYS;
              p.reBreedingAttempts = (p.reBreedingAttempts || 0) + 1;
              newLogs.push({
                day: newDay,
                text: `💔 Foal ${outcome.type}${canRefund ? ` — Live Foal Guarantee refunded $${(BREEDING_FEE + LIVE_FOAL_GUARANTEE_FEE).toLocaleString()}.` : "."} Re-breeding ${p.damName} to ${p.sireName}. Attempt ${p.reBreedingAttempts}/3. New due day ${p.dueDay}.`,
              });
            } else {
              p.resolved = true;
              newLogs.push({
                day: newDay,
                text: `💔 Foal ${outcome.type}${p.liveFoalGuarantee ? ". Live Foal Guarantee attempts exhausted." : "."}`,
              });
            }
          }
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
          cash: s.cash - upkeep + cashAdjustment,
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
      storage: jsonStorage,
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        hydrationComplete = true;
        if (state?.calibratedPars) setCalibratedPars(state.calibratedPars);
      },
    }
  )
);

// Function to manually rehydrate the store (call on client mount)
export async function rehydrateStore() {
  const state = await loadGameState();
  if (state) {
    // Use the persist middleware's built-in rehydrate
    // This will call getItem from our custom storage
    await useGame.persist.rehydrate();
    hydrationComplete = true;
    if (state.calibratedPars) setCalibratedPars(state.calibratedPars);
  } else {
    // No saved state, initialize with default
    useGame.setState(initialState());
    hydrationComplete = true;
  }
}

function ord(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

