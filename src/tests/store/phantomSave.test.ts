import { describe, it, expect, vi, beforeEach } from "vitest";

const { SAVED_KEY } = vi.hoisted(() => ({ SAVED_KEY: "gallop_game_state_fallback" }));

vi.mock("@/services/storage/storageAdapter", () => ({
  STORAGE_KEYS: {
    GAME_STATE: "gallop_game_state",
    GAME_STATE_FALLBACK: SAVED_KEY,
    RACE_FILTERS: "gallop_race_filters",
    RACE_HISTORY_LIMIT: "gallop_race_history_limit",
    RACES_DAY_JUMP: "gallop_races_day_jump",
    NEW_GAME_WIZARD: "gallop_new_game_wizard",
  },
}));

vi.mock("@/services/storage/indexedDbService", () => ({
  clearDatabase: vi.fn().mockResolvedValue(undefined),
  isIndexedDbAvailable: vi.fn(() => false),
  saveBuckets: vi.fn().mockResolvedValue(undefined),
  loadBuckets: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/core/persistence/npcCompression", () => ({
  splitHorsesForPersistence: vi.fn(() => ({ playerHorses: {}, npcSummaries: [] })),
  mergeHorses: vi.fn((a: any, b: any) => ({ ...a, ...b })),
  regenerateNpcHorses: vi.fn(() => ({})),
}));

vi.mock("@/core/persistence/pedigreePrune", () => ({
  prunePedigree: vi.fn((p: any) => p),
}));

vi.mock("@/services/storage/schemas", () => ({
  safeParseJson: vi.fn((s: string) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }),
  bucketPayloadSchema: {},
}));

// Real storage module — the coordinator is what production uses.
import {
  saveCoordinator,
  _resetSaveCoordinator,
  createIdbStorage,
  createRehydrateStore,
  saveExists,
  _resetSaveExists,
  hydrationComplete,
} from "@/game/store/storage";
import { loadBuckets } from "@/services/storage/indexedDbService";

function savedPayloads(): any[] {
  const raw = localStorage.getItem(SAVED_KEY);
  return raw ? [JSON.parse(raw)] : [];
}

describe("saveCoordinator arming", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    _resetSaveCoordinator();
    _resetSaveExists();
  });

  it("is disarmed by default", () => {
    expect(saveCoordinator.isArmed).toBe(false);
  });

  it("enqueue is a no-op while disarmed (no phantom saves)", async () => {
    saveCoordinator.enqueue({ day: 1, engineRevision: 0 } as never);
    await saveCoordinator.flush();
    expect(localStorage.getItem(SAVED_KEY)).toBeNull();
  });

  it("enqueue writes through once armed", async () => {
    saveCoordinator.arm();
    saveCoordinator.enqueue({ day: 7, horses: {}, npcStables: [], engineRevision: 1 } as never);
    await saveCoordinator.flush();
    const payloads = savedPayloads();
    expect(payloads.length).toBe(1);
    expect(payloads[0].meta.day).toBe(7);
  });

  it("strictly-older revisions cannot overwrite newer commits", async () => {
    saveCoordinator.arm();
    saveCoordinator.enqueue({ day: 10, horses: {}, npcStables: [], engineRevision: 5 } as never);
    // A stale snapshot at revision 3 arriving late must be dropped.
    saveCoordinator.enqueue({ day: 5, horses: {}, npcStables: [], engineRevision: 3 } as never);
    await saveCoordinator.flush();
    const payloads = savedPayloads();
    expect(payloads.length).toBe(1);
    expect(payloads[0].meta.day).toBe(10);
  });

  it("disarm resets revision tracking so a new game can write rev-0", async () => {
    saveCoordinator.arm();
    saveCoordinator.enqueue({ day: 400, horses: {}, npcStables: [], engineRevision: 99 } as never);
    saveCoordinator.disarm();
    saveCoordinator.arm();
    saveCoordinator.enqueue({ day: 1, horses: {}, npcStables: [], engineRevision: 0 } as never);
    await saveCoordinator.flush();
    expect(localStorage.getItem(SAVED_KEY)).not.toBeNull();
    expect(savedPayloads()[0].meta.day).toBe(1);
  });

  it("disarm invalidates a queued write so a prior session cannot clobber the new game", async () => {
    saveCoordinator.arm();
    saveCoordinator.enqueue({ day: 400, horses: {}, npcStables: [], engineRevision: 99 } as never);
    // New game starts before the queued write executes — the stale write must
    // be dropped, not land after the new session's saves.
    saveCoordinator.disarm();
    saveCoordinator.arm();
    saveCoordinator.enqueue({ day: 1, horses: {}, npcStables: [], engineRevision: 0 } as never);
    await saveCoordinator.flush();
    const payloads = savedPayloads();
    expect(payloads.length).toBe(1);
    expect(payloads[0].meta.day).toBe(1);
  });

  it("a failed save does not roll back committed memory state", async () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    saveCoordinator.arm();
    saveCoordinator.enqueue({ day: 3, horses: {}, npcStables: [], engineRevision: 2 } as never);
    // flush resolves — the write error is contained, state stays committed.
    await expect(saveCoordinator.flush()).resolves.toBeUndefined();
    spy.mockRestore();
    errSpy.mockRestore();
  });
});

describe("createIdbStorage adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    _resetSaveCoordinator();
    _resetSaveExists();
  });

  it("setItem routes through the coordinator", async () => {
    const storage = createIdbStorage();
    saveCoordinator.arm();
    await storage.setItem("test", {
      state: { day: 9, horses: {}, npcStables: [], engineRevision: 1 } as never,
    });
    await saveCoordinator.flush();
    expect(savedPayloads()[0]?.meta?.day).toBe(9);
  });

  it("getItem returns null when no save exists", async () => {
    (loadBuckets as any).mockResolvedValue(null);
    localStorage.clear();
    const storage = createIdbStorage();
    expect(await storage.getItem("test")).toBeNull();
  });
});

describe("rehydrateStore (real coordinator)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetSaveCoordinator();
    _resetSaveExists();
  });

  it("does NOT call setState when no save exists and stays disarmed", async () => {
    (loadBuckets as any).mockResolvedValue(null);
    localStorage.clear();
    const mockStore = {
      persist: { rehydrate: vi.fn().mockResolvedValue(undefined) },
      setState: vi.fn(),
    };
    const rehydrate = createRehydrateStore(mockStore);
    await rehydrate(mockStore);
    expect(mockStore.setState).not.toHaveBeenCalled();
    expect(mockStore.persist.rehydrate).not.toHaveBeenCalled();
    expect(saveExists.value).toBe(false);
    expect(hydrationComplete.value).toBe(true);
    expect(saveCoordinator.isArmed).toBe(false);
  });
});
