import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import * as opfsService from "@/services/opfsService";
import { checkOPFSAvailable } from "@/services/opfsService";

vi.mock("@/services/opfsService", () => ({
  initOPFS: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
  deleteFile: vi.fn(),
  checkOPFSAvailable: vi.fn(),
}));
import * as storageAdapter from "@/services/storageAdapter";
import type { GameState } from "@/game/types";
import { createDefaultGameState } from "@/game/store/state";

// Mock helpers
let mockOPFSData: Map<string, any> = new Map();

function resetOPFSMocks() {
  vi.mocked(checkOPFSAvailable).mockResolvedValue(true);
  mockOPFSData = new Map();

  vi.mocked(opfsService.initOPFS).mockResolvedValue(undefined);
  vi.mocked(opfsService.readFile).mockImplementation(async (filename: string) => {
    return mockOPFSData.get(filename) ?? null;
  });
  vi.mocked(opfsService.writeFile).mockImplementation(async (filename: string, data: any) => {
    mockOPFSData.set(filename, JSON.parse(JSON.stringify(data)));
  });
  vi.mocked(opfsService.deleteFile).mockImplementation(async (filename: string) => {
    mockOPFSData.delete(filename);
  });
  vi.mocked(checkOPFSAvailable).mockResolvedValue(true);
}

function mockLocalStorage() {
  const store = new Map<string, string>();
  (global as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
  return store;
}

function createMockGameState(): GameState {
  return createDefaultGameState();
}

function createMockWizardState(): storageAdapter.WizardState {
  return {
    step: 1,
    stableName: "Test Stable",
    ownerName: "Test Owner",
    silk: {
      pattern: "solid",
      primary: "#FF0000",
      secondary: "#0000FF",
      cap: "#00FF00",
    },
    backstoryId: "backstory-1",
  };
}

const originalLocalStorage = (global as any).localStorage;

describe("storageAdapter", () => {
  beforeEach(() => {
    resetOPFSMocks();
    storageAdapter._resetStorageAdapterState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (global as any).localStorage = originalLocalStorage;
  });

  // Test Suite 1: OPFS Game State Functions
  describe("OPFS Game State Functions", () => {
    describe("loadGameState", () => {
      it("successfully loads game state from OPFS", async () => {
        const mockState = createMockGameState();

        // First save the state
        await storageAdapter.saveGameState(mockState);

        // Then load it
        const loaded = await storageAdapter.loadGameState();

        expect(loaded).toEqual(JSON.parse(JSON.stringify(mockState)));
      });

      describe("when OPFS is unavailable (fallback)", () => {
        beforeEach(() => {
          mockLocalStorage();
          vi.mocked(checkOPFSAvailable).mockResolvedValue(false);
        });

        it("loads game state from localStorage fallback", async () => {
          const mockState = createMockGameState();
          localStorage.setItem("gallop_game_state_fallback", JSON.stringify(mockState));

          const loaded = await storageAdapter.loadGameState();
          expect(loaded).toEqual(JSON.parse(JSON.stringify(mockState)));
          expect(storageAdapter.useLocalStorageFallback).toBe(true);
        });

        it("returns null and handles parsing errors", async () => {
          localStorage.setItem("gallop_game_state_fallback", "{ invalid }");
          const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

          const loaded = await storageAdapter.loadGameState();

          expect(loaded).toBeNull();
          expect(consoleErrorSpy).toHaveBeenCalled();
          consoleErrorSpy.mockRestore();
        });
      });

      it("returns null when file is not found", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const loaded = await storageAdapter.loadGameState();

        expect(loaded).toBeNull();
        consoleErrorSpy.mockRestore();
      });
    });

    describe("saveGameState", () => {
      it("successfully saves game state to OPFS", async () => {
        const mockState = createMockGameState();

        await storageAdapter.saveGameState(mockState);

        const loaded = await storageAdapter.loadGameState();
        expect(loaded).toEqual(JSON.parse(JSON.stringify(mockState)));
      });

      describe("when OPFS is unavailable (fallback)", () => {
        beforeEach(() => {
          mockLocalStorage();
          vi.mocked(checkOPFSAvailable).mockResolvedValue(false);
        });

        it("saves game state to localStorage fallback", async () => {
          const mockState = createMockGameState();

          await storageAdapter.saveGameState(mockState);

          const stored = localStorage.getItem("gallop_game_state_fallback");
          expect(stored).toBe(JSON.stringify(mockState));
          expect(storageAdapter.useLocalStorageFallback).toBe(true);
        });

        it("handles localStorage exceptions", async () => {
          const mockState = createMockGameState();
          vi.spyOn(localStorage, "setItem").mockImplementation(() => {
            throw new Error("localStorage quota exceeded");
          });
          const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

          await expect(storageAdapter.saveGameState(mockState)).rejects.toThrow(
            "localStorage quota exceeded",
          );

          expect(consoleErrorSpy).toHaveBeenCalled();
          consoleErrorSpy.mockRestore();
        });
      });

      it("successfully saves large game state objects", async () => {
        const largeState = createMockGameState();
        // Add a large array to simulate large state
        largeState.horses = Array.from({ length: 1000 }, (_, i) => ({
          id: `horse-${i}`,
          name: `Horse ${i}`,
          gender: "horse" as const,
          age: 3,
        })) as any;

        await storageAdapter.saveGameState(largeState);

        const loaded = await storageAdapter.loadGameState();
        expect(loaded?.horses.length).toBe(1000);
      });
    });

    describe("clearGameState", () => {
      it("successfully deletes game state file", async () => {
        const mockState = createMockGameState();

        await storageAdapter.saveGameState(mockState);
        await storageAdapter.clearGameState();

        const loaded = await storageAdapter.loadGameState();
        expect(loaded).toBeNull();
      });

      describe("when OPFS is unavailable (fallback)", () => {
        beforeEach(() => {
          mockLocalStorage();
          vi.mocked(checkOPFSAvailable).mockResolvedValue(false);
        });

        it("clears game state from localStorage fallback", async () => {
          const mockState = createMockGameState();
          localStorage.setItem("gallop_game_state_fallback", JSON.stringify(mockState));

          // First set the useLocalStorageFallback flag by initializing storage
          await storageAdapter.loadGameState();

          await storageAdapter.clearGameState();

          const stored = localStorage.getItem("gallop_game_state_fallback");
          expect(stored).toBeNull();
        });
      });
    });
  });

  // Test Suite 2: localStorage Settings Functions
  describe("localStorage Settings Functions", () => {
    beforeEach(() => {
      mockLocalStorage();
    });

    describe("loadRaceFilters", () => {
      it("successfully loads race filters from localStorage", () => {
        const freshStorage = storageAdapter;
        const mockFilters = { track: "Churchill Downs", grade: "G1" };

        localStorage.setItem("gallop_race_filters", JSON.stringify(mockFilters));

        const loaded = freshStorage.loadRaceFilters();

        expect(loaded).toEqual(mockFilters);
      });

      it("returns empty object when key doesn't exist", () => {
        const freshStorage = storageAdapter;
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const loaded = freshStorage.loadRaceFilters();

        expect(loaded).toEqual({});
        consoleErrorSpy.mockRestore();
      });

      it("returns empty object for invalid JSON", () => {
        const freshStorage = storageAdapter;
        localStorage.setItem("gallop_race_filters", "{ invalid }");
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const loaded = freshStorage.loadRaceFilters();

        expect(loaded).toEqual({});
        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
      });

      it("returns empty object when localStorage throws", () => {
        const freshStorage = storageAdapter;
        vi.spyOn(localStorage, "getItem").mockImplementation(() => {
          throw new Error("localStorage disabled");
        });
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const loaded = freshStorage.loadRaceFilters();

        expect(loaded).toEqual({});
        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
      });
    });

    describe("saveRaceFilters", () => {
      it("successfully saves race filters to localStorage", () => {
        const freshStorage = storageAdapter;
        const mockFilters = { track: "Churchill Downs", grade: "G1" };

        freshStorage.saveRaceFilters(mockFilters);

        const stored = localStorage.getItem("gallop_race_filters");
        expect(stored).toBe(JSON.stringify(mockFilters));
      });

      it("logs error when localStorage throws", () => {
        const freshStorage = storageAdapter;
        const mockFilters = { track: "Churchill Downs" };
        vi.spyOn(localStorage, "setItem").mockImplementation(() => {
          throw new Error("localStorage disabled");
        });
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        freshStorage.saveRaceFilters(mockFilters);

        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
      });
    });

    describe("loadRaceHistoryLimit", () => {
      it("successfully loads valid race history limit", () => {
        const freshStorage = storageAdapter;
        localStorage.setItem("gallop_race_history_limit", "20");

        const loaded = freshStorage.loadRaceHistoryLimit();

        expect(loaded).toBe(20);
      });

      it("returns default 50 when key doesn't exist", () => {
        const freshStorage = storageAdapter;
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const loaded = freshStorage.loadRaceHistoryLimit();

        expect(loaded).toBe(50);
        consoleErrorSpy.mockRestore();
      });

      it("returns default 50 for invalid value", () => {
        const freshStorage = storageAdapter;
        localStorage.setItem("gallop_race_history_limit", "invalid");
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const loaded = freshStorage.loadRaceHistoryLimit();

        expect(loaded).toBe(50);
        consoleErrorSpy.mockRestore();
      });

      it("returns default 50 for out of range value", () => {
        const freshStorage = storageAdapter;
        localStorage.setItem("gallop_race_history_limit", "100");
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const loaded = freshStorage.loadRaceHistoryLimit();

        expect(loaded).toBe(50);
        consoleErrorSpy.mockRestore();
      });

      it("returns default 50 for non-numeric values", () => {
        const freshStorage = storageAdapter;
        localStorage.setItem("gallop_race_history_limit", "abc");
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const loaded = freshStorage.loadRaceHistoryLimit();

        expect(loaded).toBe(50);
        consoleErrorSpy.mockRestore();
      });
    });

    describe("saveRaceHistoryLimit", () => {
      it("successfully saves valid race history limit", () => {
        const freshStorage = storageAdapter;

        freshStorage.saveRaceHistoryLimit(20);

        const stored = localStorage.getItem("gallop_race_history_limit");
        expect(stored).toBe("20");
      });

      it("logs error when localStorage throws", () => {
        const freshStorage = storageAdapter;
        vi.spyOn(localStorage, "setItem").mockImplementation(() => {
          throw new Error("localStorage disabled");
        });
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        freshStorage.saveRaceHistoryLimit(20);

        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
      });
    });

    describe("loadDayJump", () => {
      it("successfully loads day jump value", () => {
        const freshStorage = storageAdapter;
        localStorage.setItem("gallop_races_day_jump", "7");

        const loaded = freshStorage.loadDayJump();

        expect(loaded).toBe("7");
      });

      it("returns undefined when key doesn't exist", () => {
        const freshStorage = storageAdapter;
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const loaded = freshStorage.loadDayJump();

        expect(loaded).toBeUndefined();
        consoleErrorSpy.mockRestore();
      });
    });

    describe("saveDayJump", () => {
      it("successfully saves day jump value", () => {
        const freshStorage = storageAdapter;

        freshStorage.saveDayJump("7");

        const stored = localStorage.getItem("gallop_races_day_jump");
        expect(stored).toBe("7");
      });

      it("logs error when localStorage throws", () => {
        const freshStorage = storageAdapter;
        vi.spyOn(localStorage, "setItem").mockImplementation(() => {
          throw new Error("localStorage disabled");
        });
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        freshStorage.saveDayJump("7");

        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
      });
    });

    describe("clearSettings", () => {
      it("successfully removes all settings keys", () => {
        const freshStorage = storageAdapter;
        localStorage.setItem("gallop_race_filters", "{}");
        localStorage.setItem("gallop_race_history_limit", "20");
        localStorage.setItem("gallop_races_day_jump", "7");

        freshStorage.clearSettings();

        expect(localStorage.getItem("gallop_race_filters")).toBeNull();
        expect(localStorage.getItem("gallop_race_history_limit")).toBeNull();
        expect(localStorage.getItem("gallop_races_day_jump")).toBeNull();
      });

      it("handles gracefully when keys don't exist", () => {
        const freshStorage = storageAdapter;
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        expect(() => freshStorage.clearSettings()).not.toThrow();
        consoleErrorSpy.mockRestore();
      });
    });
  });

  // Test Suite 3: Wizard State Functions
  describe("Wizard State Functions", () => {
    beforeEach(() => {
      mockLocalStorage();
    });

    describe("loadWizardState", () => {
      it("successfully loads wizard state from localStorage", () => {
        const freshStorage = storageAdapter;
        const mockState = createMockWizardState();

        localStorage.setItem("gallop_new_game_wizard", JSON.stringify(mockState));

        const loaded = freshStorage.loadWizardState();

        expect(loaded).toEqual(JSON.parse(JSON.stringify(mockState)));
      });

      it("returns null when key doesn't exist", () => {
        const freshStorage = storageAdapter;
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const loaded = freshStorage.loadWizardState();

        expect(loaded).toBeNull();
        consoleErrorSpy.mockRestore();
      });

      it("returns null for invalid JSON", () => {
        const freshStorage = storageAdapter;
        localStorage.setItem("gallop_new_game_wizard", "{ invalid }");
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const loaded = freshStorage.loadWizardState();

        expect(loaded).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
      });

      it("returns null when localStorage throws", () => {
        const freshStorage = storageAdapter;
        vi.spyOn(localStorage, "getItem").mockImplementation(() => {
          throw new Error("localStorage disabled");
        });
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const loaded = freshStorage.loadWizardState();

        expect(loaded).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
      });
    });

    describe("saveWizardState", () => {
      it("successfully saves wizard state to localStorage", () => {
        const freshStorage = storageAdapter;
        const mockState = createMockWizardState();

        freshStorage.saveWizardState(mockState);

        const stored = localStorage.getItem("gallop_new_game_wizard");
        expect(stored).toBe(JSON.stringify(mockState));
      });

      it("saves all wizard state properties", () => {
        const freshStorage = storageAdapter;
        const mockState = createMockWizardState();

        freshStorage.saveWizardState(mockState);

        const stored = JSON.parse(localStorage.getItem("gallop_new_game_wizard")!);
        expect(stored).toHaveProperty("step");
        expect(stored).toHaveProperty("stableName");
        expect(stored).toHaveProperty("ownerName");
        expect(stored).toHaveProperty("silk");
        expect(stored).toHaveProperty("backstoryId");
      });

      it("logs error when localStorage throws", () => {
        const freshStorage = storageAdapter;
        const mockState = createMockWizardState();
        vi.spyOn(localStorage, "setItem").mockImplementation(() => {
          throw new Error("localStorage disabled");
        });
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        freshStorage.saveWizardState(mockState);

        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
      });
    });

    describe("clearWizardState", () => {
      it("successfully removes wizard state key", () => {
        const freshStorage = storageAdapter;
        localStorage.setItem("gallop_new_game_wizard", JSON.stringify(createMockWizardState()));

        freshStorage.clearWizardState();

        expect(localStorage.getItem("gallop_new_game_wizard")).toBeNull();
      });

      it("logs error when localStorage throws", () => {
        const freshStorage = storageAdapter;
        vi.spyOn(localStorage, "removeItem").mockImplementation(() => {
          throw new Error("localStorage disabled");
        });
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        freshStorage.clearWizardState();

        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
      });

      it("handles gracefully when key doesn't exist", () => {
        const freshStorage = storageAdapter;
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        expect(() => freshStorage.clearWizardState()).not.toThrow();
        consoleErrorSpy.mockRestore();
      });
    });
  });

  // Test Suite 4: Composite Functions
  describe("Composite Functions", () => {
    describe("clearAllGameData", () => {
      it("successfully clears both OPFS game state and localStorage settings", async () => {
        mockLocalStorage();

        // Save game state
        await storageAdapter.saveGameState(createMockGameState());
        localStorage.setItem("gallop_race_filters", "{}");

        await storageAdapter.clearAllGameData();

        const loaded = await storageAdapter.loadGameState();
        expect(loaded).toBeNull();
        expect(localStorage.getItem("gallop_race_filters")).toBeNull();
      });

      it("logs error when localStorage fails but OPFS succeeds", async () => {
        mockLocalStorage();

        await storageAdapter.saveGameState(createMockGameState());

        // Mock localStorage to throw
        const localStorageMock = (global as any).localStorage;
        const originalRemoveItem = localStorageMock.removeItem;
        localStorageMock.removeItem = () => {
          throw new Error("localStorage disabled");
        };
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        await storageAdapter.clearAllGameData();

        const loaded = await storageAdapter.loadGameState();
        expect(loaded).toBeNull(); // OPFS should still be cleared
        expect(consoleErrorSpy).toHaveBeenCalled();
        localStorageMock.removeItem = originalRemoveItem;
        consoleErrorSpy.mockRestore();
      });
    });
  });

  // Test Suite 5: Integration Scenarios
  describe("Integration Scenarios", () => {
    describe("Error Handling Consistency", () => {
      it("logs localStorage errors to console.error", () => {
        mockLocalStorage();
        const localStorageMock = (global as any).localStorage;
        const originalGetItem = localStorageMock.getItem;
        localStorageMock.getItem = () => {
          throw new Error("localStorage disabled");
        };
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        storageAdapter.loadRaceFilters();

        expect(consoleErrorSpy).toHaveBeenCalled();
        localStorageMock.getItem = originalGetItem;
        consoleErrorSpy.mockRestore();
      });
    });

    describe("Data Integrity", () => {
      it("round-trip: saveGameState then loadGameState returns identical data", async () => {
        const mockState = createMockGameState();

        await storageAdapter.saveGameState(mockState);
        const loaded = await storageAdapter.loadGameState();

        expect(loaded).toEqual(JSON.parse(JSON.stringify(mockState)));
      });

      it("wizard state round-trip returns identical data", () => {
        mockLocalStorage();
        const mockState = createMockWizardState();

        storageAdapter.saveWizardState(mockState);
        const loaded = storageAdapter.loadWizardState();

        expect(loaded).toEqual(JSON.parse(JSON.stringify(mockState)));
      });
    });
  });
});
