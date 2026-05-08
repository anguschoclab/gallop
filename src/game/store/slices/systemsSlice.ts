/**
 * Systems Slice
 * Optional subsystems and advanced features state management
 */

import type { SystemsState } from "@/game/state/systemsState";
import { createDefaultSystemsState } from "@/game/state/systemsState";
import type { Jockey, HorseCampaign } from "@/game/types";
import type { AnyIntent } from "@/core/resolver/intents";
import type { ActionResult } from "@/game/store";
import type { UserSettings } from "@/core/settings/settingsTypes";
import { createDefaultUserSettings } from "@/core/settings/settingsTypes";
import type { PlayerFacilities } from "@/core/facilities";
import type { ManagerReputation } from "@/core/reputation";
import type { BreedingProgram } from "@/core/breeding/programs";
import { formatCurrency } from "@/components/HorseBits";
import type { GameStateCreator } from "../types";

export type SystemsSlice = SystemsState & {
  hireJockey: (jockeyId: string) => ActionResult;
  rerollJockeySilk: (jockeyId: string) => ActionResult;
  assignJockey: (raceId: string, horseId: string, jockeyId: string) => ActionResult;
  upgradeFacility: (facilityType: string) => ActionResult;
  updateStudFee: (horseId: string, newFee: number) => ActionResult;
  retireToStud: (horseId: string) => ActionResult;
  geldingHorse: (horseId: string) => ActionResult;
  renameHorse: (horseId: string, newName: string) => ActionResult;
  enqueueIntent: (intent: AnyIntent) => void;
  setCampaign: (campaign: HorseCampaign) => void;
  updateCampaignSlot: (
    horseId: string,
    slotIndex: number,
    patch: Partial<HorseCampaign["slots"][number]>,
  ) => void;
  dismissCampaignFlag: (horseId: string, flagIndex: number) => void;
  deleteCampaign: (horseId: string) => void;
  generateAutoCampaign: (horseId: string, goalType: string, targetRaceKey?: string) => void;
  updateUserSettings: (settings: Partial<UserSettings>) => void;
  updateDisplaySettings: (settings: Partial<UserSettings["display"]>) => void;
  updateGameplaySettings: (settings: Partial<UserSettings["gameplay"]>) => void;
  updateNotificationSettings: (settings: Partial<UserSettings["notifications"]>) => void;
  updateAudioSettings: (settings: Partial<UserSettings["audio"]>) => void;
  resetSettings: () => void;
  clearPendingCeremonies: () => void;
  setNpcStables: (stables: SystemsState["npcStables"]) => void;
  setJockeys: (jockeys: Jockey[]) => void;
  setAwards: (awards: SystemsState["awards"]) => void;
  setFacilities: (facilities: PlayerFacilities) => void;
  setUserSettings: (settings: UserSettings) => void;
  setExpenses: (expenses: SystemsState["expenses"]) => void;
  setTransactions: (transactions: SystemsState["transactions"]) => void;
  setReplays: (replays: SystemsState["replays"]) => void;
  setReputation: (reputation: ManagerReputation) => void;
  setPlayerProfile: (profile: SystemsState["playerProfile"]) => void;
  registerHorseName: (name: string) => void;
  unregisterHorseName: (name: string) => void;
  createBreedingProgram: (program: BreedingProgram) => void;
  updateBreedingProgram: (program: BreedingProgram) => void;
  deleteBreedingProgram: (programId: string) => void;
  enrollDamInProgram: (programId: string, damId: string) => void;
};

export const createSystemsSlice: GameStateCreator<SystemsSlice> = (set, get) => {
  return {
    ...createDefaultSystemsState(),

    hireJockey: (jockeyId: string) => {
      const s = get();
      const jockey = s.jockeys?.find((j: Jockey) => j.id === jockeyId);
      if (!jockey) return { ok: false, reason: "Jockey not found." };
      if (jockey.stableId) return { ok: false, reason: "Jockey is already under contract." };

      const bonus = jockey.ridingFee * 30;
      if (s.cash < bonus)
        return {
          ok: false,
          reason: `Insufficient cash. Sign-on bonus is ${formatCurrency(bonus)}.`,
        };

      get().enqueueIntent({
        id: generateUUID(),
        entityId: jockeyId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "jockey_contract",
        jockeyId,
        stableId: "player",
        contractUntil: s.day + 90,
        bonus,
      });

      return { ok: true };
    },

    rerollJockeySilk: (jockeyId: string) => {
      const s = get();
      const jockey = s.jockeys?.find((j: Jockey) => j.id === jockeyId);
      if (!jockey) return { ok: false, reason: "Jockey not found." };
      if (!jockey.stableId || jockey.stableId !== "player")
        return { ok: false, reason: "Can only reroll silk for your jockeys." };

      const rerollCost = 100;
      if (s.cash < rerollCost)
        return {
          ok: false,
          reason: `Insufficient cash. Silk reroll costs ${formatCurrency(rerollCost)}.`,
        };

      get().enqueueIntent({
        id: generateUUID(),
        entityId: jockeyId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "reroll_silk",
        jockeyId,
        cost: rerollCost,
      });

      return { ok: true };
    },

    assignJockey: (raceId: string, horseId: string, jockeyId: string) => {
      const s = get();
      const race = s.races.find((r: any) => r.id === raceId);
      if (!race) return { ok: false, reason: "Race not found." };
      const horse = s.horses.find((h: any) => h.id === horseId);
      if (!horse) return { ok: false, reason: "Horse not found." };
      if (!horse.owned) return { ok: false, reason: "You don't own this horse." };
      const jockey = s.jockeys?.find((j: Jockey) => j.id === jockeyId);
      if (!jockey) return { ok: false, reason: "Jockey not found." };

      get().enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "jockey_assignment",
        raceId,
        horseId,
        jockeyId,
      });

      return { ok: true };
    },

    upgradeFacility: (facilityType: string) => {
      const s = get();
      if (!s.facilities) return { ok: false, reason: "Facilities not initialized." };
      const facility = s.facilities[facilityType as keyof PlayerFacilities];
      if (!facility) return { ok: false, reason: "Facility not found." };
      const nextLevel = facility.level + 1;
      const cost = Math.floor(5000 * Math.pow(1.5, nextLevel - 1));
      if (s.cash < cost)
        return {
          ok: false,
          reason: `Insufficient cash. Upgrade costs ${formatCurrency(cost)}.`,
        };

      get().enqueueIntent({
        id: generateUUID(),
        entityId: facilityType,
        source: "player",
        day: s.day,
        priority: 100,
        type: "facility_upgrade",
        facilityId: facilityType,
        nextLevel,
        cost,
      });

      return { ok: true };
    },

    updateStudFee: (horseId: string, newFee: number) => {
      const s = get();
      const horse = s.horses.find((h: any) => h.id === horseId);
      if (!horse) return { ok: false, reason: "Horse not found." };
      if (!horse.owned) return { ok: false, reason: "You don't own this horse." };
      if (!horse.stud) return { ok: false, reason: "Horse is not standing at stud." };

      get().enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "update_stud_fee",
        horseId,
        newFee,
      });

      return { ok: true };
    },

    retireToStud: (horseId: string) => {
      const s = get();
      const horse = s.horses.find((h: any) => h.id === horseId);
      if (!horse) return { ok: false, reason: "Horse not found." };
      if (!horse.owned) return { ok: false, reason: "You don't own this horse." };
      if (horse.gender !== "horse" && horse.gender !== "colt")
        return { ok: false, reason: "Only male horses can stand at stud." };
      if (horse.age < 4)
        return { ok: false, reason: "Horse must be at least 4 years old to stand at stud." };

      get().enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "stud_retirement",
        horseId,
        standingFee: 500,
        bookSize: 20,
      });

      return { ok: true };
    },

    geldingHorse: (horseId: string) => {
      const s = get();
      const horse = s.horses.find((h: any) => h.id === horseId);
      if (!horse) return { ok: false, reason: "Horse not found." };
      if (!horse.owned) return { ok: false, reason: "You don't own this horse." };
      if (horse.gender === "horse" || horse.gender === "gelding")
        return { ok: false, reason: "Horse is already male." };

      get().enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "gelding",
        horseId,
      });

      return { ok: true };
    },

    renameHorse: (horseId: string, newName: string) => {
      const s = get();
      const horse = s.horses.find((h: any) => h.id === horseId);
      if (!horse) return { ok: false, reason: "Horse not found." };
      if (!horse.owned) return { ok: false, reason: "You don't own this horse." };

      const lowerNewName = newName.toLowerCase();
      if (s.usedHorseNames.includes(lowerNewName) && lowerNewName !== horse.name.toLowerCase()) {
        return { ok: false, reason: "Name is already in use." };
      }

      get().enqueueIntent({
        id: generateUUID(),
        entityId: horseId,
        source: "player",
        day: s.day,
        priority: 100,
        type: "rename",
        horseId,
        newName,
      });

      return { ok: true };
    },

    enqueueIntent: (intent: AnyIntent) => {
      set((state) => ({
        pendingIntents: [...(state.pendingIntents || []), intent],
      }));
    },

    setCampaign: (campaign: HorseCampaign) => {
      set((state) => ({
        campaigns: state.campaigns?.map((c: HorseCampaign) =>
          c.horseId === campaign.horseId ? campaign : c,
        ) || [campaign],
      }));
    },

    updateCampaignSlot: (
      horseId: string,
      slotIndex: number,
      patch: Partial<HorseCampaign["slots"][number]>,
    ) => {
      set((state) => ({
        campaigns: state.campaigns?.map((c: HorseCampaign) =>
          c.horseId === horseId
            ? {
                ...c,
                slots: c.slots.map((s, i) => (i === slotIndex ? { ...s, ...patch } : s)),
              }
            : c,
        ),
      }));
    },

    dismissCampaignFlag: (horseId: string, flagIndex: number) => {
      set((state) => ({
        campaigns: state.campaigns?.map((c: HorseCampaign) =>
          c.horseId === horseId
            ? {
                ...c,
                flags: c.flags.filter((_, i) => i !== flagIndex),
              }
            : c,
        ),
      }));
    },

    deleteCampaign: (horseId: string) => {
      set((state) => ({
        campaigns: state.campaigns?.filter((c: HorseCampaign) => c.horseId !== horseId),
      }));
    },

    generateAutoCampaign: (horseId: string, goalType: string, targetRaceKey?: string) => {
      // Full implementation would be in a helper - placeholder for now
      set((state) => ({
        campaigns: state.campaigns || [],
      }));
    },

    updateUserSettings: (settings: Partial<UserSettings>) => {
      set((state) => ({
        userSettings: { ...state.userSettings, ...settings },
      }));
    },

    updateDisplaySettings: (settings: Partial<UserSettings["display"]>) => {
      set((state) => ({
        userSettings: {
          ...state.userSettings,
          display: { ...state.userSettings?.display, ...settings },
        },
      }));
    },

    updateGameplaySettings: (settings: Partial<UserSettings["gameplay"]>) => {
      set((state) => ({
        userSettings: {
          ...state.userSettings,
          gameplay: { ...state.userSettings?.gameplay, ...settings },
        },
      }));
    },

    updateNotificationSettings: (settings: Partial<UserSettings["notifications"]>) => {
      set((state) => ({
        userSettings: {
          ...state.userSettings,
          notifications: { ...state.userSettings?.notifications, ...settings },
        },
      }));
    },

    updateAudioSettings: (settings: Partial<UserSettings["audio"]>) => {
      set((state) => ({
        userSettings: {
          ...state.userSettings,
          audio: { ...state.userSettings?.audio, ...settings },
        },
      }));
    },

    resetSettings: () => {
      set((state) => ({
        userSettings: createDefaultUserSettings(state.day),
      }));
    },

    clearPendingCeremonies: () => {
      set({
        pendingAwardCeremonies: undefined,
        currentCeremonyIndex: undefined,
      });
    },

    setNpcStables: (stables) => {
      set({ npcStables: stables });
    },

    setJockeys: (jockeys) => {
      set({ jockeys });
    },

    setAwards: (awards) => {
      set({ awards });
    },

    setFacilities: (facilities) => {
      set({ facilities });
    },

    setUserSettings: (settings) => {
      set({ userSettings: settings });
    },

    setExpenses: (expenses) => {
      set({ expenses });
    },

    setTransactions: (transactions) => {
      set({ transactions });
    },

    setReplays: (replays) => {
      set({ replays });
    },

    setReputation: (reputation) => {
      set({ reputation });
    },

    setPlayerProfile: (profile) => {
      set({ playerProfile: profile });
    },

    registerHorseName: (name: string) => {
      const lower = name.toLowerCase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((s: any) => ({
        usedHorseNames: s.usedHorseNames.includes(lower)
          ? s.usedHorseNames
          : [...s.usedHorseNames, lower],
      }));
    },

    unregisterHorseName: (name: string) => {
      const lower = name.toLowerCase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((s: any) => ({
        usedHorseNames: s.usedHorseNames.filter((n: string) => n !== lower),
      }));
    },

    createBreedingProgram: (program: BreedingProgram) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((s: any) => ({
        breedingPrograms: [...s.breedingPrograms, program],
      }));
    },

    updateBreedingProgram: (program: BreedingProgram) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((s: any) => ({
        breedingPrograms: s.breedingPrograms.map((p: BreedingProgram) =>
          p.id === program.id ? program : p,
        ),
      }));
    },

    deleteBreedingProgram: (programId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((s: any) => ({
        breedingPrograms: s.breedingPrograms.filter((p: BreedingProgram) => p.id !== programId),
      }));
    },

    enrollDamInProgram: (programId: string, damId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((s: any) => ({
        breedingPrograms: s.breedingPrograms.map((p: BreedingProgram) =>
          p.id === programId
            ? {
                ...p,
                enrolledDamIds: p.enrolledDamIds.includes(damId)
                  ? p.enrolledDamIds
                  : [...p.enrolledDamIds, damId],
              }
            : p,
        ),
      }));
    },
  };
}
