/**
 * useCompareStables.ts - Non-persisted UI store for the stable comparison set
 *
 * Holds the set of NPC stable IDs selected for side-by-side comparison. This is
 * ephemeral UI-only state (not game state) — it does not persist across reloads.
 * Shared by the card compare toggle, the sticky compare bar, the drawer, and the
 * dedicated compare route.
 *
 * Dependencies: zustand (create)
 * Related files: src/components/stable/StableCard.tsx, StableCompareBar.tsx, StableCompareDrawer.tsx
 */

import { create } from "zustand";

export const MAX_COMPARE = 4;

interface CompareStore {
  ids: string[];
  toggle: (id: string) => void;
  add: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
}

export const useCompareStables = create<CompareStore>((set, get) => ({
  ids: [],
  toggle: (id) =>
    set((state) => {
      if (state.ids.includes(id)) {
        return { ids: state.ids.filter((x) => x !== id) };
      }
      if (state.ids.length >= MAX_COMPARE) return state;
      return { ids: [...state.ids, id] };
    }),
  add: (id) =>
    set((state) => {
      if (state.ids.includes(id)) return state;
      if (state.ids.length >= MAX_COMPARE) return state;
      return { ids: [...state.ids, id] };
    }),
  remove: (id) => set((state) => ({ ids: state.ids.filter((x) => x !== id) })),
  clear: () => set({ ids: [] }),
  has: (id) => get().ids.includes(id),
}));
