import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GameState, Horse, Race } from "./types";
import {
  breed,
  generateHorse,
  generatePublicStud,
  generateRace,
  horsePrice,
  studFee,
} from "./horseGen";

const PRIZE_SPLIT = [0.6, 0.25, 0.1, 0.05];
const UPKEEP_PER_HORSE = 50;
const TRAINING_SLOTS_PER_DAY = 2;
const STARTING_CASH = 5000;
const GESTATION_DAYS = 14;
const RETIREMENT_AGE = 12;

type Actions = {
  newGame: () => void;
  trainHorse: (horseId: string, kind: "speed" | "stamina" | "acceleration" | "rest") => void;
  buyHorse: (horseId: string) => void;
  enterRace: (raceId: string, horseId: string) => void;
  withdrawRace: (raceId: string, horseId: string) => void;
  resolveRace: (raceId: string, result: { horseId: string; position: number; time: number }[]) => void;
  advanceDay: () => void;
  retireHorse: (horseId: string) => void;
  breedHorse: (damId: string, sireId: string) => { ok: boolean; reason?: string };
};

function initialState(): GameState {
  // Ensure starter pair has at least one of each sex for breeding
  const horses: Horse[] = [
    generateHorse({ tier: "starter", owned: true, sex: "F", age: 3 }),
    generateHorse({ tier: "starter", owned: true, sex: "M", age: 3 }),
  ];
  const market: Horse[] = Array.from({ length: 5 }, () =>
    generateHorse({ tier: Math.random() < 0.6 ? "budget" : "mid" })
  );
  const studs: Horse[] = Array.from({ length: 4 }, () => generatePublicStud());
  const races: Race[] = [];
  for (let d = 1; d <= 7; d++) {
    const count = Math.random() < 0.7 ? 2 : 3;
    for (let i = 0; i < count; i++) races.push(generateRace(d));
  }
  return {
    day: 1,
    cash: STARTING_CASH,
    horses,
    market,
    studs,
    races,
    trainingUsed: {},
    log: [{ day: 1, text: "Welcome to your stable. Train, race, and breed champions!" }],
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
        if (horse.retired || horse.pregnancy) return;
        const used = s.trainingUsed[horseId] ?? 0;
        if (used >= TRAINING_SLOTS_PER_DAY) return;
        if (kind === "rest") {
          horse.energy = Math.min(100, horse.energy + 30);
        } else {
          const cost = 75;
          if (s.cash < cost) return;
          if (horse.energy < 15) return;
          horse.energy = Math.max(0, horse.energy - 18);
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
        if (horse.retired || horse.pregnancy) return;
        if (race.resolved) return;
        if (s.cash < race.entryFee) return;
        if (race.entries.some((e) => e.horseId === horseId)) return;
        if (race.entries.length >= race.fieldSize) return;
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
        for (const r of result) {
          const h = s.horses.find((hh) => hh.id === r.horseId);
          if (!h) continue;
          h.energy = Math.max(0, h.energy - 25);
          h.raceHistory = [{ raceId, raceName: race.name, position: r.position, day: s.day }, ...h.raceHistory].slice(0, 20);
          if (r.position === 1) h.form = Math.min(10, h.form + 3);
          else if (r.position <= 3) h.form = Math.min(10, h.form + 1);
          else h.form = Math.max(-10, h.form - 1);
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
        set({
          races: [...s.races],
          horses: [...s.horses],
          cash: s.cash + earned,
          log: [
            { day: s.day, text: `${race.name} — ${summary}${earned ? ` (won $${earned.toLocaleString()})` : ""}` },
            ...s.log,
          ].slice(0, 50),
        });
      },

      retireHorse: (horseId) => {
        const s = get();
        const horse = s.horses.find((h) => h.id === horseId);
        if (!horse) return;
        horse.retired = true;
        set({
          horses: [...s.horses],
          log: [{ day: s.day, text: `${horse.name} has been retired.` }, ...s.log].slice(0, 50),
        });
      },

      breedHorse: (damId, sireId) => {
        const s = get();
        const dam = s.horses.find((h) => h.id === damId);
        if (!dam) return { ok: false, reason: "Mare not found" };
        if (dam.sex !== "F") return { ok: false, reason: "Dam must be female" };
        if (dam.pregnancy) return { ok: false, reason: "Mare is already pregnant" };
        if (dam.age < 3) return { ok: false, reason: "Mare must be at least 3 years old" };

        // sire can be owned or public stud
        const sire =
          s.horses.find((h) => h.id === sireId) ?? s.studs.find((h) => h.id === sireId);
        if (!sire) return { ok: false, reason: "Sire not found" };
        if (sire.sex !== "M") return { ok: false, reason: "Sire must be male" };
        if (sire.id === dam.id) return { ok: false, reason: "Cannot breed a horse with itself" };

        const fee = sire.publicStud ? sire.studFee ?? studFee(sire) : 0;
        if (s.cash < fee) return { ok: false, reason: "Not enough cash for stud fee" };

        dam.pregnancy = {
          sireId: sire.id,
          sireName: sire.name,
          dueDay: s.day + GESTATION_DAYS,
          expectedFoalPotential: Math.round((sire.potential + dam.potential) / 2),
        };

        set({
          horses: [...s.horses],
          cash: s.cash - fee,
          log: [
            {
              day: s.day,
              text: `${dam.name} bred to ${sire.name}${fee ? ` for $${fee.toLocaleString()}` : ""}. Due day ${dam.pregnancy.dueDay}.`,
            },
            ...s.log,
          ].slice(0, 50),
        });
        return { ok: true };
      },

      advanceDay: () => {
        const s = get();
        for (const race of s.races) {
          if (race.resolved) continue;
          if (race.day > s.day) continue;
          race.resolved = true;
          race.result = [];
        }
        const upkeep = s.horses.length * UPKEEP_PER_HORSE;
        const newDay = s.day + 1;

        // Advance horses: energy + births
        const horses: Horse[] = [];
        const births: Horse[] = [];
        for (const h of s.horses) {
          const updated: Horse = { ...h, energy: Math.min(100, h.energy + 35) };
          if (updated.pregnancy && newDay >= updated.pregnancy.dueDay) {
            // Find sire (could be retired/owned/public, may have been removed)
            const sire =
              s.horses.find((hh) => hh.id === updated.pregnancy!.sireId) ??
              s.studs.find((hh) => hh.id === updated.pregnancy!.sireId);
            if (sire) {
              const foal = breed(sire, updated);
              births.push(foal);
            }
            updated.pregnancy = undefined;
          }
          horses.push(updated);
        }
        const allHorses = [...horses, ...births];

        // Refresh market
        let market = [...s.market];
        if (market.length > 3) market = market.slice(2);
        while (market.length < 5) {
          const r = Math.random();
          const tier = r < 0.5 ? "budget" : r < 0.85 ? "mid" : "elite";
          market.push(generateHorse({ tier: tier as never }));
        }
        // Refresh studs occasionally (rotate one every ~5 days)
        let studs = [...s.studs];
        if (Math.random() < 0.2) {
          studs = studs.slice(1);
        }
        while (studs.length < 4) studs.push(generatePublicStud());

        const races = [...s.races];
        const futureDay = newDay + 6;
        const count = Math.random() < 0.7 ? 2 : 3;
        for (let i = 0; i < count; i++) races.push(generateRace(futureDay));
        const pruned = races.filter((r) => r.day >= newDay - 3);

        const log = [{ day: newDay, text: `Day ${newDay} begins. Upkeep: $${upkeep}.` }, ...s.log];
        for (const foal of births) {
          log.unshift({
            day: newDay,
            text: `🐴 Foal born: ${foal.name} (${foal.sex}, potential ${foal.potential}).`,
          });
        }

        set({
          day: newDay,
          cash: s.cash - upkeep,
          horses: allHorses,
          market,
          studs,
          races: pruned,
          trainingUsed: {},
          log: log.slice(0, 50),
        });
        void RETIREMENT_AGE;
      },
    }),
    {
      name: "horse-racing-game-v1",
      version: 2,
      migrate: (persisted: unknown, _version: number) => {
        // Backfill new fields on saves from before breeding existed
        const state = persisted as Partial<GameState> & Record<string, unknown>;
        const fix = (h: Horse): Horse => ({
          ...h,
          sex: h.sex ?? (Math.random() < 0.5 ? "M" : "F"),
          lineage: h.lineage ?? {},
        });
        if (Array.isArray(state.horses)) state.horses = state.horses.map(fix);
        if (Array.isArray(state.market)) state.market = state.market.map(fix);
        if (!Array.isArray(state.studs)) {
          state.studs = Array.from({ length: 4 }, () => generatePublicStud());
        }
        return state as GameState;
      },
    }
  )
);

function ord(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
