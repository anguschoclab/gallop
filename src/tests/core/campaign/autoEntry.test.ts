import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runAutoEntries, reconcileSlotStatuses, type AutoEntryContext } from '@/core/campaign/autoEntry';
import type { Horse, Race, HorseCampaign, CampaignRaceSlot } from '@/game/types';
import * as eligibility from '@/core/race/eligibility';

describe('autoEntry', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('runAutoEntries', () => {
    const mockHorse = { id: 'h1' } as Horse;
    const baseCampaign: HorseCampaign = {
      autoManaged: true,
      currentGoal: 'Test Goal',
      slots: [],
    };

    it('returns early if campaign is not autoManaged', () => {
      const ctx: AutoEntryContext = {
        horse: mockHorse,
        campaign: { ...baseCampaign, autoManaged: false },
        races: [],
        currentDay: 10,
        cash: 1000,
        enterRaceFn: vi.fn(),
      };

      const result = runAutoEntries(ctx);
      expect(result.entered).toEqual([]);
      expect(result.skipped).toEqual([]);
    });

    it('skips slot if currentDay is outside dayWindow', () => {
      const slot: CampaignRaceSlot = { status: 'planned', dayTarget: 20, dayWindow: 5, importance: 'prep' };
      const ctx: AutoEntryContext = {
        horse: mockHorse,
        campaign: { ...baseCampaign, slots: [slot] },
        races: [],
        currentDay: 10, // Window is 15-20
        cash: 1000,
        enterRaceFn: vi.fn(),
      };

      const result = runAutoEntries(ctx);
      expect(result.updatedSlots[0]).toEqual(slot);
      expect(result.skipped).toHaveLength(0); // Not even considered a skip, just ignored
    });

    it('successfully matches by ID and calls enterRaceFn', () => {
      vi.spyOn(eligibility, 'isHorseEligibleForRace').mockReturnValue(true);
      const enterFn = vi.fn().mockReturnValue({ ok: true });

      const slot: CampaignRaceSlot = { status: 'planned', dayTarget: 20, dayWindow: 5, raceId: 'r1', importance: 'target' };
      const race = { id: 'r1', name: 'Test Race', day: 20, entryFee: 100, resolved: false, entries: [] } as unknown as Race;

      const ctx: AutoEntryContext = {
        horse: mockHorse,
        campaign: { ...baseCampaign, slots: [slot] },
        races: [race],
        currentDay: 18,
        cash: 500,
        enterRaceFn: enterFn,
      };

      const result = runAutoEntries(ctx);

      expect(enterFn).toHaveBeenCalledWith('r1', 'h1');
      expect(result.entered).toHaveLength(1);
      expect(result.updatedSlots[0]).toMatchObject({ raceId: 'r1', status: 'entered' });
    });

    it('falls back to constraints if raceId is missing', () => {
      vi.spyOn(eligibility, 'isHorseEligibleForRace').mockReturnValue(true);
      const enterFn = vi.fn().mockReturnValue({ ok: true });

      const slot: CampaignRaceSlot = {
        status: 'planned', dayTarget: 20, dayWindow: 5,
        constraintDistance: 1200, constraintSurface: 'Dirt', importance: 'prep'
      };
      const race = {
        id: 'r2', name: 'Match Race', day: 18, entryFee: 100, resolved: false,
        distance: 1200, surface: 'Dirt', entries: []
      } as unknown as Race;

      const ctx: AutoEntryContext = {
        horse: mockHorse,
        campaign: { ...baseCampaign, slots: [slot] },
        races: [race],
        currentDay: 18,
        cash: 500,
        enterRaceFn: enterFn,
      };

      const result = runAutoEntries(ctx);

      expect(enterFn).toHaveBeenCalledWith('r2', 'h1');
      expect(result.updatedSlots[0]).toMatchObject({ raceId: 'r2', status: 'entered' });
    });

    it('fails gracefully if cash is lower than entryFee', () => {
      const slot: CampaignRaceSlot = { status: 'planned', dayTarget: 20, dayWindow: 5, raceId: 'r1', importance: 'target' };
      const race = { id: 'r1', day: 20, entryFee: 1000, resolved: false, entries: [] } as unknown as Race;

      const ctx: AutoEntryContext = {
        horse: mockHorse,
        campaign: { ...baseCampaign, slots: [slot] },
        races: [race],
        currentDay: 18,
        cash: 500,
        enterRaceFn: vi.fn(),
      };

      const result = runAutoEntries(ctx);

      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toContain('Insufficient cash');
      expect(result.updatedSlots[0].status).toBe('planned');
    });

    it('fails gracefully if not eligible', () => {
      vi.spyOn(eligibility, 'isHorseEligibleForRace').mockReturnValue(false);

      const slot: CampaignRaceSlot = { status: 'planned', dayTarget: 20, dayWindow: 5, raceId: 'r1', importance: 'target' };
      const race = { id: 'r1', day: 20, entryFee: 100, resolved: false, entries: [] } as unknown as Race;

      const ctx: AutoEntryContext = {
        horse: mockHorse,
        campaign: { ...baseCampaign, slots: [slot] },
        races: [race],
        currentDay: 18,
        cash: 500,
        enterRaceFn: vi.fn(),
      };

      const result = runAutoEntries(ctx);

      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toContain('Not eligible');
    });

    it('fails gracefully if enterRaceFn returns error', () => {
      vi.spyOn(eligibility, 'isHorseEligibleForRace').mockReturnValue(true);
      const enterFn = vi.fn().mockReturnValue({ ok: false, reason: 'Test Error' });

      const slot: CampaignRaceSlot = { status: 'planned', dayTarget: 20, dayWindow: 5, raceId: 'r1', importance: 'target' };
      const race = { id: 'r1', day: 20, entryFee: 100, resolved: false, entries: [] } as unknown as Race;

      const ctx: AutoEntryContext = {
        horse: mockHorse,
        campaign: { ...baseCampaign, slots: [slot] },
        races: [race],
        currentDay: 18,
        cash: 500,
        enterRaceFn: enterFn,
      };

      const result = runAutoEntries(ctx);

      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toBe('Test Error');
    });
  });

  describe('reconcileSlotStatuses', () => {
    it('upgrades entered to completed if race is resolved', () => {
      const campaign = {
        slots: [{ status: 'entered', raceId: 'r1' } as CampaignRaceSlot]
      } as HorseCampaign;
      const races = [{ id: 'r1', resolved: true } as Race];

      const result = reconcileSlotStatuses(campaign, races);
      expect(result[0].status).toBe('completed');
    });

    it('ignores slots that are not entered', () => {
      const campaign = {
        slots: [{ status: 'planned', raceId: 'r1' } as CampaignRaceSlot]
      } as HorseCampaign;
      const races = [{ id: 'r1', resolved: true } as Race];

      const result = reconcileSlotStatuses(campaign, races);
      expect(result[0].status).toBe('planned');
    });

    it('ignores slots where race is not resolved', () => {
      const campaign = {
        slots: [{ status: 'entered', raceId: 'r1' } as CampaignRaceSlot]
      } as HorseCampaign;
      const races = [{ id: 'r1', resolved: false } as Race];

      const result = reconcileSlotStatuses(campaign, races);
      expect(result[0].status).toBe('entered');
    });
  });
});
