import { describe, it, expect } from 'vitest';
import {
  generateAllStables,
  getStableById,
  getMajorStables,
  getStablesByTier,
  getStartingCashForTier,
  getTargetHorseCountForTier,
  STABLE_CONFIG
} from './npcStables';
import { Stable } from './types';

describe('npcStables', () => {
  describe('generateAllStables', () => {
    it('generates the correct number of stables with default config', () => {
      const stables = generateAllStables(1);

      const eliteCount = stables.filter(s => s.tier === 'elite').length;
      const midCount = stables.filter(s => s.tier === 'mid').length;
      const budgetMajorCount = stables.filter(s => s.tier === 'budget' && s.isMajor).length;
      const fillerCount = stables.filter(s => s.tier === 'budget' && !s.isMajor).length;

      expect(stables.length).toBe(120);
      expect(eliteCount).toBe(STABLE_CONFIG.elite.count);
      expect(midCount).toBe(STABLE_CONFIG.mid.count);
      expect(budgetMajorCount).toBe(STABLE_CONFIG.budget.count);
      expect(fillerCount).toBe(STABLE_CONFIG.filler.count);
    });

    it('generates the correct number of stables with custom config', () => {
      const customConfig = {
        elite: { count: 2, reputationRange: [90, 98] as [number, number] },
        mid: { count: 3, reputationRange: [70, 86] as [number, number] },
        budget: { count: 1, reputationRange: [50, 65] as [number, number] },
        filler: { count: 5 }
      };

      const stables = generateAllStables(1, customConfig);
      expect(stables.length).toBe(11);

      expect(stables.filter(s => s.tier === 'elite').length).toBe(2);
      expect(stables.filter(s => s.tier === 'mid').length).toBe(3);
      expect(stables.filter(s => s.tier === 'budget' && s.isMajor).length).toBe(1);
      expect(stables.filter(s => !s.isMajor).length).toBe(5);
    });

    it('generates elite stables with correct properties', () => {
      const customConfig = {
        elite: { count: 5, reputationRange: [90, 98] as [number, number] },
        mid: { count: 0, reputationRange: [70, 86] as [number, number] },
        budget: { count: 0, reputationRange: [50, 65] as [number, number] },
        filler: { count: 0 }
      };
      const stables = generateAllStables(1, customConfig);

      for (const stable of stables.filter(s => s.id !== 'player')) {
        expect(stable.tier).toBe('elite');
        expect(stable.reputation).toBeGreaterThanOrEqual(90);
        expect(stable.reputation).toBeLessThanOrEqual(98);
        expect(stable.cash).toBeGreaterThanOrEqual(500000);
        expect(stable.cash).toBeLessThanOrEqual(999999);
        expect(stable.isMajor).toBe(true);
        expect(stable.id).toBeDefined();
        expect(stable.name).toBeDefined();
      }
    });

    it('generates mid stables with correct properties', () => {
      const customConfig = {
        elite: { count: 0, reputationRange: [90, 98] as [number, number] },
        mid: { count: 5, reputationRange: [70, 86] as [number, number] },
        budget: { count: 0, reputationRange: [50, 65] as [number, number] },
        filler: { count: 0 }
      };
      const stables = generateAllStables(1, customConfig);

      for (const stable of stables.filter(s => s.id !== 'player')) {
        expect(stable.tier).toBe('mid');
        expect(stable.reputation).toBeGreaterThanOrEqual(70);
        expect(stable.reputation).toBeLessThanOrEqual(86);
        expect(stable.cash).toBeGreaterThanOrEqual(150000);
        expect(stable.cash).toBeLessThanOrEqual(349999);
        expect(stable.isMajor).toBe(true);
        expect(stable.id).toBeDefined();
        expect(stable.name).toBeDefined();
      }
    });

    it('generates budget stables with correct properties', () => {
      const customConfig = {
        elite: { count: 0, reputationRange: [90, 98] as [number, number] },
        mid: { count: 0, reputationRange: [70, 86] as [number, number] },
        budget: { count: 5, reputationRange: [50, 65] as [number, number] },
        filler: { count: 0 }
      };
      const stables = generateAllStables(1, customConfig);

      for (const stable of stables.filter(s => s.id !== 'player')) {
        expect(stable.tier).toBe('budget');
        expect(stable.reputation).toBeGreaterThanOrEqual(50);
        expect(stable.reputation).toBeLessThanOrEqual(65);
        expect(stable.cash).toBeGreaterThanOrEqual(20000);
        expect(stable.cash).toBeLessThanOrEqual(99999);
        expect(stable.isMajor).toBe(true);
        expect(stable.id).toBeDefined();
        expect(stable.name).toBeDefined();
      }
    });

    it('generates filler stables with correct properties', () => {
      const customConfig = {
        elite: { count: 0, reputationRange: [90, 98] as [number, number] },
        mid: { count: 0, reputationRange: [70, 86] as [number, number] },
        budget: { count: 0, reputationRange: [50, 65] as [number, number] },
        filler: { count: 10 }
      };
      const stables = generateAllStables(1, customConfig);

      for (const stable of stables.filter(s => s.id !== 'player')) {
        expect(stable.tier).toBe('budget');
        expect(stable.reputation).toBeGreaterThanOrEqual(30);
        expect(stable.reputation).toBeLessThanOrEqual(54);
        expect(stable.cash).toBeGreaterThanOrEqual(10000);
        expect(stable.cash).toBeLessThanOrEqual(59999);
        expect(stable.isMajor).toBe(false);
        expect(stable.id).toBeDefined();
        expect(stable.name).toBeDefined();
      }
    });
  });

  describe('helper functions', () => {
    const mockStables: Partial<Stable>[] = [
      { id: '1', name: 'Elite 1', tier: 'elite', isMajor: true },
      { id: '2', name: 'Mid 1', tier: 'mid', isMajor: true },
      { id: '3', name: 'Budget 1', tier: 'budget', isMajor: true },
      { id: '4', name: 'Filler 1', tier: 'budget', isMajor: false },
    ];

    it('getStableById returns correct stable or undefined', () => {
      const stable = getStableById(mockStables as Stable[], '2');
      expect(stable).toBeDefined();
      expect(stable?.name).toBe('Mid 1');

      const missing = getStableById(mockStables as Stable[], '99');
      expect(missing).toBeUndefined();
    });

    it('getMajorStables returns only major stables', () => {
      const majors = getMajorStables(mockStables as Stable[]);
      expect(majors.length).toBe(3);
      expect(majors.every(s => s.isMajor)).toBe(true);
    });

    it('getStablesByTier returns correct stables', () => {
      const elites = getStablesByTier(mockStables as Stable[], 'elite');
      expect(elites.length).toBe(1);
      expect(elites[0].id).toBe('1');

      const budgets = getStablesByTier(mockStables as Stable[], 'budget');
      expect(budgets.length).toBe(2);
    });

    it('getStartingCashForTier returns cash in correct ranges', () => {
      for (let i = 0; i < 100; i++) {
        const eliteCash = getStartingCashForTier('elite');
        expect(eliteCash).toBeGreaterThanOrEqual(500000);
        expect(eliteCash).toBeLessThanOrEqual(999999);

        const midCash = getStartingCashForTier('mid');
        expect(midCash).toBeGreaterThanOrEqual(150000);
        expect(midCash).toBeLessThanOrEqual(349999);

        const budgetCash = getStartingCashForTier('budget');
        expect(budgetCash).toBeGreaterThanOrEqual(20000);
        expect(budgetCash).toBeLessThanOrEqual(69999);
      }
    });

    it('getTargetHorseCountForTier returns correct counts', () => {
      for (let i = 0; i < 100; i++) {
        // Minor stables
        expect(getTargetHorseCountForTier('elite', false)).toBe(10);
        expect(getTargetHorseCountForTier('mid', false)).toBe(10);
        expect(getTargetHorseCountForTier('budget', false)).toBe(10);

        // Major stables
        const eliteCount = getTargetHorseCountForTier('elite', true);
        expect(eliteCount).toBeGreaterThanOrEqual(30);
        expect(eliteCount).toBeLessThanOrEqual(39);

        const midCount = getTargetHorseCountForTier('mid', true);
        expect(midCount).toBeGreaterThanOrEqual(20);
        expect(midCount).toBeLessThanOrEqual(29);

        const budgetCount = getTargetHorseCountForTier('budget', true);
        expect(budgetCount).toBeGreaterThanOrEqual(15);
        expect(budgetCount).toBeLessThanOrEqual(24);
      }
    });
  });
});
