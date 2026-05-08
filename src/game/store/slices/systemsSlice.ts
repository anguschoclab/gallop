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

export function createSystemsSlice(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: any,
): SystemsSlice {
  return {
    ...createDefaultSystemsState(),

    hireJockey: (jockeyId: string) => {
      const s = get();
      const jockey = s.jockeys?.find((j: Jockey) => j.id === jockeyId);
      if (!jockey) return { ok: false, reason: "Jockey not found." };
      if (jockey.stableId) return { ok: false, reason: "Jockey is already under contract." };

      const signOnBonus = jockey.ridingFee * 30;
      if (s.cash < signOnBonus)
        return {
          ok: false,
          reason: `Insufficient cash. Sign-on bonus is ${formatCurrency(signOnBonus)}.`,
        };

      set({
        cash: s.cash - signOnBonus,
        jockeys: s.jockeys?.map((j: Jockey) =>
          j.id === jockeyId ? { ...j, contractUntil: s.day + 90 } : j,
        ),
        log: [
          {
            day: s.day,
            text: `Hired jockey ${jockey.name} for ${formatCurrency(signOnBonus)} sign-on bonus.`,
          },
          ...s.log,
        ].slice(0, 50),
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

      set({
        cash: s.cash - rerollCost,
        jockeys: s.jockeys?.map((j: Jockey) =>
          j.id === jockeyId
            ? {
                ...j,
                silk: `#${Math.floor(Math.random() * 16777215)
                  .toString(16)
                  .padStart(6, "0")}`,
              }
            : j,
        ),
        log: [
          {
            day: s.day,
            text: `Rerolled silk for ${jockey.name} for ${formatCurrency(rerollCost)}.`,
          },
          ...s.log,
        ].slice(0, 50),
      });
      return { ok: true };
    },

    assignJockey: (raceId: string, horseId: string, jockeyId: string) => {
      const s = get();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const race = s.races.find((r: any) => r.id === raceId);
      if (!race) return { ok: false, reason: "Race not found." };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const horse = s.horses.find((h: any) => h.id === horseId);
      if (!horse) return { ok: false, reason: "Horse not found." };
      if (!horse.owned) return { ok: false, reason: "You don't own this horse." };
      const jockey = s.jockeys?.find((j: Jockey) => j.id === jockeyId);
      if (!jockey) return { ok: false, reason: "Jockey not found." };

      set({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        races: s.races.map((r: any) =>
          r.id === raceId
            ? {
                ...r,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                entries: r.entries.map((e: any) =>
                  e.horseId === horseId ? { ...e, jockeyId } : e,
                ),
              }
            : r,
        ),
        log: [
          {
            day: s.day,
            text: `Assigned ${jockey.name} to ${horse.name} for ${race.name}.`,
          },
          ...s.log,
        ].slice(0, 50),
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

      set({
        cash: s.cash - cost,
        facilities: {
          ...s.facilities,
          [facilityType]: { ...facility, level: nextLevel },
        },
        log: [
          {
            day: s.day,
            text: `Upgraded ${facilityType} to level ${nextLevel} for ${formatCurrency(cost)}.`,
          },
          ...s.log,
        ].slice(0, 50),
      });
      return { ok: true };
    },

    updateStudFee: (horseId: string, newFee: number) => {
      const s = get();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const horse = s.horses.find((h: any) => h.id === horseId);
      if (!horse) return { ok: false, reason: "Horse not found." };
      if (!horse.owned) return { ok: false, reason: "You don't own this horse." };
      if (!horse.stud) return { ok: false, reason: "Horse is not standing at stud." };

      set({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        horses: s.horses.map((h: any) =>
          h.id === horseId ? { ...h, stud: { ...h.stud, standingFee: newFee } } : h,
        ),
        log: [
          {
            day: s.day,
            text: `Updated ${horse.name}'s stud fee to ${formatCurrency(newFee)}.`,
          },
          ...s.log,
        ].slice(0, 50),
      });
      return { ok: true };
    },

    retireToStud: (horseId: string) => {
      const s = get();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const horse = s.horses.find((h: any) => h.id === horseId);
      if (!horse) return { ok: false, reason: "Horse not found." };
      if (!horse.owned) return { ok: false, reason: "You don't own this horse." };
      if (horse.gender !== "horse" && horse.gender !== "colt")
        return { ok: false, reason: "Only male horses can stand at stud." };
      if (horse.age < 4)
        return { ok: false, reason: "Horse must be at least 4 years old to stand at stud." };

      set({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        horses: s.horses.map((h: any) =>
          h.id === horseId
            ? {
                ...h,
                stud: {
                  atStud: true,
                  standingFee: 500,
                  bookSize: 20,
                  seasonBookings: 0,
                  lifetimeFoals: 0,
                },
              }
            : h,
        ),
        log: [
          {
            day: s.day,
            text: `${horse.name} retired to stud.`,
          },
          ...s.log,
        ].slice(0, 50),
      });
      return { ok: true };
    },

    geldingHorse: (horseId: string) => {
      const s = get();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const horse = s.horses.find((h: any) => h.id === horseId);
      if (!horse) return { ok: false, reason: "Horse not found." };
      if (!horse.owned) return { ok: false, reason: "You don't own this horse." };
      if (horse.gender === "horse" || horse.gender === "gelding")
        return { ok: false, reason: "Horse is already male." };

      set({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        horses: s.horses.map((h: any) => (h.id === horseId ? { ...h, gender: "gelding" } : h)),
        log: [
          {
            day: s.day,
            text: `${horse.name} gelded.`,
          },
          ...s.log,
        ].slice(0, 50),
      });
      return { ok: true };
    },

    renameHorse: (horseId: string, newName: string) => {
      const s = get();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const horse = s.horses.find((h: any) => h.id === horseId);
      if (!horse) return { ok: false, reason: "Horse not found." };
      if (!horse.owned) return { ok: false, reason: "You don't own this horse." };

      const lowerNewName = newName.toLowerCase();
      if (s.usedHorseNames.includes(lowerNewName) && lowerNewName !== horse.name.toLowerCase()) {
        return { ok: false, reason: "Name is already in use." };
      }

      set({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        horses: s.horses.map((h: any) => (h.id === horseId ? { ...h, name: newName } : h)),
        usedHorseNames: [
          ...s.usedHorseNames.filter((n: string) => n !== horse.name.toLowerCase()),
          lowerNewName,
        ],
        log: [
          {
            day: s.day,
            text: `${horse.name} renamed to ${newName}.`,
          },
          ...s.log,
        ].slice(0, 50),
      });
      return { ok: true };
    },

    enqueueIntent: (intent: AnyIntent) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((state: any) => ({
        pendingIntents: [...(state.pendingIntents || []), intent],
      }));
    },

    setCampaign: (campaign: HorseCampaign) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((state: any) => ({
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((state: any) => ({
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((state: any) => ({
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((state: any) => ({
        campaigns: state.campaigns?.filter((c: HorseCampaign) => c.horseId !== horseId),
      }));
    },

    generateAutoCampaign: (horseId: string, goalType: string, targetRaceKey?: string) => {
      // Full implementation would be in a helper - placeholder for now
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((state: any) => ({
        campaigns: state.campaigns || [],
      }));
    },

    updateUserSettings: (settings: Partial<UserSettings>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((state: any) => ({
        userSettings: { ...state.userSettings, ...settings },
      }));
    },

    updateDisplaySettings: (settings: Partial<UserSettings["display"]>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((state: any) => ({
        userSettings: {
          ...state.userSettings,
          display: { ...state.userSettings?.display, ...settings },
        },
      }));
    },

    updateGameplaySettings: (settings: Partial<UserSettings["gameplay"]>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((state: any) => ({
        userSettings: {
          ...state.userSettings,
          gameplay: { ...state.userSettings?.gameplay, ...settings },
        },
      }));
    },

    updateNotificationSettings: (settings: Partial<UserSettings["notifications"]>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((state: any) => ({
        userSettings: {
          ...state.userSettings,
          notifications: { ...state.userSettings?.notifications, ...settings },
        },
      }));
    },

    updateAudioSettings: (settings: Partial<UserSettings["audio"]>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((state: any) => ({
        userSettings: {
          ...state.userSettings,
          audio: { ...state.userSettings?.audio, ...settings },
        },
      }));
    },

    resetSettings: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set((state: any) => ({
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
