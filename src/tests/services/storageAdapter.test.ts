import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";

import * as storageAdapter from "@/services/storage/storageAdapter";

function mockLocalStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
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
    },
    writable: true,
    configurable: true,
  });
  return store;
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
    worldSize: "medium",
  };
}

describe("storageAdapter", () => {
  beforeAll(() => {
    mockLocalStorage();
  });

  beforeEach(() => {
    mockLocalStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockLocalStorage();
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
        expect(stored).toHaveProperty("worldSize");
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
