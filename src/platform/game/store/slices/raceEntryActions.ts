import type { AnyIntent } from "@/platform/resolver/intents";
import type { JockeyInstructions } from "@/domains/tactics/model/tacticsTypes";
import { findBumpableEntryIndex } from "@/domains/race/simulation/entry/bumpResolver";
import { autoCreateJournalEntry } from "@/domains/tactics/simulation/strategyJournal";
import { generateUUID } from "@/shared/uuid/uuid";
import { requireOwned, requireHorse } from "@/platform/game/store/guards";
import type { StoreSet, StoreGet, StoreType } from "@/platform/game/store/types";
import type { CoreSlice } from "@/platform/game/store/slices/coreSlice";
import { isPlayerOwned } from "@/domains/horse/simulation/ownership";
import { initEngineClient, getEngineClient } from "@/platform/game/store/engineClient";
import { snapshotState } from "@/platform/game/store/slices/advanceDayActions";
import { engineWorldSynced, noteCommittedWorld } from "@/platform/game/store/engineSync";
import type { RaceRunner } from "@/domains/race/simulation/types";

export function createRaceEntryActions(
  set: StoreSet,
  get: StoreGet,
  enqueueIntent: (intent: AnyIntent) => void,
): Pick<
  CoreSlice,
  | "enterRace"
  | "withdrawRace"
  | "setRaceTactics"
  | "resolveRaceWithImpacts"
  | "withdrawClaim"
  | "purchaseInsurance"
  | "cancelInsurance"
> {
  return {
    enterRace: (raceId: string, horseId: string) => {
      const s = get();
      const race = s.races[raceId];
      if (!race) return { ok: false, reason: "Race not found." };
      const horse = requireHorse(s.horses, horseId);
      const ownershipGuard = requireOwned(horse);
      if (ownershipGuard) return ownershipGuard;

      if (horse!.energy < 50) return { ok: false, reason: "Horse lacks sufficient energy." };
      if (race.entries.some((e: { horseId: string }) => e.horseId === horseId))
        return { ok: false, reason: "Horse already entered." };

      if (race.graded?.requiresInvitation) {
        const invitedIds = race.invitedHorseIds ?? race.graded.invitedHorseIds ?? [];
        const isInvited = invitedIds.includes(horseId);
        const isWinAndYouIn =
          race.graded.key &&
          horse!.winAndYouInQualified?.some(
            (q) => q.raceKey === race.graded!.key && q.year === Math.floor((s.day - 1) / 365) + 1,
          );
        if (!isInvited && !isWinAndYouIn) {
          return { ok: false, reason: "Invitation required for this race." };
        }
      }

      const raceGrade = race.graded_override?.grade ?? race.graded?.grade ?? null;
      let matchedNominationId: string | undefined;
      if (raceGrade) {
        const noms = s.playerNominations;
        const active = noms.find(
          (n) => n.horseId === horseId && n.raceId === raceId && n.status === "active",
        );
        if (!active) {
          return {
            ok: false,
            reason: `${horse!.name} must be nominated before entering a ${raceGrade} race.`,
          };
        }
        matchedNominationId = active.id;
      }

      let bumpEntryHorseId: string | undefined;
      if (race.entries.length >= race.fieldSize) {
        const weakestIdx = findBumpableEntryIndex(race.entries, horse!, (id) => s.horses[id]);
        if (weakestIdx === -1) {
          return {
            ok: false,
            reason: "Race is full — your horse isn't rated high enough to bump an entry.",
          };
        }
        bumpEntryHorseId = race.entries[weakestIdx].horseId;
      }

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "race_entry",
        raceId,
        horseId,
        bumpEntryHorseId,
      });

      if (matchedNominationId) {
        set((state) => ({
          playerNominations: state.playerNominations.map((n) =>
            n.id === matchedNominationId ? { ...n, status: "entered" } : n,
          ),
        }));
      }

      set((state) => ({
        strategyJournal: autoCreateJournalEntry(state.strategyJournal, {
          horseId,
          horseName: horse!.name,
          raceId,
          raceName: race.name,
          raceDay: race.day,
          createdDay: s.day,
        }),
      }));

      return { ok: true };
    },

    setRaceTactics: (raceId: string, horseId: string, jockeyInstructions: JockeyInstructions) => {
      const s = get();
      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "tactics",
        raceId,
        horseId,
        jockeyInstructions,
      });
    },

    withdrawRace: (raceId: string, horseId: string) => {
      const s = get();
      const race = s.races[raceId];
      if (!race) return { ok: false, reason: "Race not found." };
      const entry = race.entries.find((e: { horseId: string }) => e.horseId === horseId);
      if (!entry) return { ok: false, reason: "Horse not entered in this race." };

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "race_withdrawal",
        raceId,
        horseId,
      });

      return { ok: true };
    },

    purchaseInsurance: (
      horseId: string,
      policyType: "injury_only" | "mortality_only" | "comprehensive",
    ) => {
      const s = get();
      const horse = s.horses?.[horseId];
      if (!horse) return { ok: false, reason: "Horse not found." };
      if (!isPlayerOwned(horse)) return { ok: false, reason: "Horse not owned." };
      if (horse.insurancePolicy) return { ok: false, reason: "Horse already has insurance." };

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "insurance_purchase",
        horseId,
        policyType,
      });

      return { ok: true };
    },

    cancelInsurance: (horseId: string) => {
      const s = get();
      const horse = s.horses?.[horseId];
      if (!horse) return { ok: false, reason: "Horse not found." };
      if (!horse.insurancePolicy) return { ok: false, reason: "Horse has no insurance to cancel." };

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "insurance_cancel",
        horseId,
      });

      return { ok: true };
    },

    resolveRaceWithImpacts: (
      raceId: string,
      result: { horseId: string; position: number; time: number }[],
      liveRunners?: RaceRunner[],
      factorLedgers?: Record<
        string,
        import("@/domains/race/simulation/factorLedger").RunnerFactorLedger
      >,
      snapshots?: import("@/domains/race/model/engine/raceSnapshotTypes").RaceSnapshot[],
    ) => {
      const s = get();
      const generation = s.engineGeneration ?? 0;

      // Degraded path — engine unavailable or the command rejected: queue the
      // resolution intent directly so a later advance still resolves the
      // race. Live impacts were never applied, so the intent carries no
      // liveImpactsApplied marker and the pipeline applies the full set.
      const enqueueFallbackIntent = () => {
        const current = get();
        if ((current.engineGeneration ?? 0) !== generation) return;
        const pending = current.pendingIntents ?? [];
        if (
          pending.some(
            (i) => i.type === "race_resolution" && (i as { raceId?: string }).raceId === raceId,
          )
        ) {
          return;
        }
        enqueueIntent({
          id: generateUUID(),
          entityId: raceId,
          source: "system",
          day: current.day,
          priority: 10,
          type: "race_resolution",
          raceId,
          results: result,
          runners: liveRunners,
          factorLedgers,
          snapshots,
        });
      };

      const submit = async (): Promise<void> => {
        let response;
        try {
          await initEngineClient();
          response = await getEngineClient().submit({
            kind: "resolveLiveRace",
            raceId,
            result,
            runners: liveRunners,
            factorLedgers,
            snapshots,
            state: engineWorldSynced(s) ? undefined : snapshotState(s),
          });
        } catch {
          enqueueFallbackIntent();
          return;
        }

        const current = get();
        if ((current.engineGeneration ?? 0) !== generation) return;
        if (response.status === "rejected") {
          enqueueFallbackIntent();
          return;
        }
        if (response.status !== "resolved") return;
        // CAS guard: a superseding commit must not be overwritten by a
        // resolve issued against an older revision.
        if (response.revision <= (current.engineRevision ?? 0)) return;

        noteCommittedWorld(response.state);
        const update: Record<string, unknown> = {
          ...response.state,
          engineRevision: response.revision,
        };
        delete update.execution;
        delete update.lastFrameTime;
        set(update as Partial<StoreType>);
      };
      return submit();
    },

    withdrawClaim: (raceId: string, horseId: string) => {
      const s = get();
      const race = s.races[raceId];
      if (!race) return { ok: false, reason: "Race not found." };
      if (race.claimingPrice === undefined) {
        return { ok: false, reason: "Race is not a claiming race." };
      }
      if (race.raceClass !== "OptionalClaiming" && race.raceClass !== "MaidenOptionalClaiming") {
        return { ok: false, reason: "Withdrawal is only available in optional claiming races." };
      }
      const horse = s.horses[horseId];
      if (!horse) return { ok: false, reason: "Horse not found." };
      if (!isPlayerOwned(horse)) return { ok: false, reason: "Horse not owned." };
      if (!race.entries.some((entry) => entry.horseId === horseId)) {
        return { ok: false, reason: "Horse is not entered in this race." };
      }
      if (s.day >= race.day) return { ok: false, reason: "Post time has passed." };

      enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "withdraw_from_claiming",
        raceId,
        horseId,
      });

      return { ok: true };
    },
  };
}
