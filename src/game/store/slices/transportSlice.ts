/**
 * store/slices/transportSlice.ts - Transportation state slice
 *
 * This file provides transportation-related state and actions for managing
 * horse transport requests, costs, and logistics.
 *
 * Dependencies: @/core/transportation/transportationTypes (TransportRequest, createTransportRequest, getTransportModeForDistance), @/game/uuid (generateUUID), ../types (ActionResult, SliceCreator)
 * Related files: store/index.ts (uses this slice), @/core/transportation/transportationTypes.ts (transport types)
 */

import type { TransportRequest, TransportMode } from "@/core/transportation/transportationTypes";
import {
  createTransportRequest,
  getTransportModeForDistance,
} from "@/core/transportation/transportationTypes";
import { generateUUID } from "@/core/uuid";
import type { ActionResult, SliceCreator } from "../types";
import { requireOwned, requireHorse } from "../guards";

export type TransportSlice = {
  createTransport: (
    horseId: string,
    fromLocation: string,
    toLocation: string,
    distance: number,
    mode?: TransportMode,
  ) => ActionResult & { transportId?: string };
  cancelTransport: (transportId: string) => ActionResult;
  completeTransport: (transportId: string) => ActionResult;
};

export const createTransportSlice: SliceCreator<TransportSlice> = (set, get) => ({
  createTransport: (
    horseId: string,
    fromLocation: string,
    toLocation: string,
    distance: number,
    mode?: TransportMode,
  ) => {
    const s = get();
    const horse = requireHorse(s.horses, horseId);
    const ownershipGuard = requireOwned(horse);
    if (ownershipGuard) return ownershipGuard;

    const transportMode = mode ?? getTransportModeForDistance(distance);
    const transport = createTransportRequest(
      horseId,
      fromLocation,
      toLocation,
      distance,
      s.day,
      transportMode,
    );

    // Check if player has enough cash for transport
    if (s.cash < transport.cost) {
      return { ok: false, reason: "Insufficient funds for transport." };
    }

    // Add transport to state
    set((state: any) => ({
      ...state,
      transports: [...(state.transports || []), transport],
      cash: state.cash - transport.cost,
    }));

    // Log the transport
    get().enqueueIntent({
      id: generateUUID(),
      entityId: horseId,
      source: "player",
      day: s.day,
      priority: 50,
      type: "transport",
      transportId: transport.id,
      cost: transport.cost,
    } as any);

    return { ok: true, transportId: transport.id };
  },

  cancelTransport: (transportId: string) => {
    const s = get();
    const transport = s.transports?.find((t) => t.id === transportId);

    if (!transport) {
      return { ok: false, reason: "Transport request not found." };
    }

    if (transport.status !== "idle") {
      return { ok: false, reason: "Cannot cancel transport that is already in transit." };
    }

    // Refund the cost
    set((state: any) => ({
      ...state,
      transports: state.transports?.filter((t: any) => t.id !== transportId),
      cash: state.cash + transport.cost,
    }));

    return { ok: true };
  },

  completeTransport: (transportId: string) => {
    const s = get();
    const transport = s.transports?.find((t) => t.id === transportId);

    if (!transport) {
      return { ok: false, reason: "Transport request not found." };
    }

    // Update transport status to arrived
    set((state: any) => ({
      ...state,
      transports: state.transports?.map((t: any) =>
        t.id === transportId ? { ...t, status: "arrived" } : t,
      ),
    }));

    return { ok: true };
  },
});
