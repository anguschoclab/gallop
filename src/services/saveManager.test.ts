import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as saveManager from "./saveManager";
import * as opfsService from "./opfsService";

vi.mock("./opfsService", () => ({
  writeFile: vi.fn(),
  readFile: vi.fn(),
  deleteFile: vi.fn(),
  checkOPFSAvailable: vi.fn(),
}));

const METADATA_STORAGE_KEY = "gallop_saves_metadata";
const METADATA_FILENAME = "savesMetadata.json";

function mockLocalStorage() {
  const store = new Map<string, string>();
  const localStorageMock = {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
  vi.stubGlobal("localStorage", localStorageMock);
  return { store, localStorageMock };
}

describe("saveManager", () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.resetAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("getSaveSlots", () => {
    describe("when OPFS is available", () => {
      beforeEach(() => {
        vi.mocked(opfsService.checkOPFSAvailable).mockResolvedValue(true);
      });

      it("loads metadata from OPFS", async () => {
        const mockMetadata: saveManager.SaveSlotMetadata[] = [
          {
            id: "1",
            name: "Save 1",
            timestamp: 123,
            gameDay: 1,
            stableName: "Test Stable",
            cash: 1000,
            isAutoSave: false,
          },
        ];
        vi.mocked(opfsService.readFile).mockResolvedValue(mockMetadata);

        const slots = await saveManager.getSaveSlots();

        expect(opfsService.readFile).toHaveBeenCalledWith(METADATA_FILENAME);
        expect(slots).toEqual(mockMetadata);
      });

      it("returns empty array when OPFS file is null", async () => {
        vi.mocked(opfsService.readFile).mockResolvedValue(null);

        const slots = await saveManager.getSaveSlots();

        expect(slots).toEqual([]);
      });

      it("logs error and returns empty array when OPFS read fails", async () => {
        vi.mocked(opfsService.readFile).mockRejectedValue(new Error("OPFS error"));

        const slots = await saveManager.getSaveSlots();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Failed to load save metadata from OPFS:",
          expect.any(Error),
        );
        expect(slots).toEqual([]);
      });
    });

    describe("when OPFS is unavailable (localStorage fallback)", () => {
      let storage: Map<string, string>;
      let localStorageMock: any;

      beforeEach(() => {
        vi.mocked(opfsService.checkOPFSAvailable).mockResolvedValue(false);
        const mocked = mockLocalStorage();
        storage = mocked.store;
        localStorageMock = mocked.localStorageMock;
      });

      it("loads metadata from localStorage", async () => {
        const mockMetadata: saveManager.SaveSlotMetadata[] = [
          {
            id: "1",
            name: "Save 1",
            timestamp: 123,
            gameDay: 1,
            stableName: "Test Stable",
            cash: 1000,
            isAutoSave: false,
          },
        ];
        storage.set(METADATA_STORAGE_KEY, JSON.stringify(mockMetadata));

        const slots = await saveManager.getSaveSlots();

        expect(localStorageMock.getItem).toHaveBeenCalledWith(METADATA_STORAGE_KEY);
        expect(slots).toEqual(mockMetadata);
      });

      it("returns empty array when localStorage is empty", async () => {
        const slots = await saveManager.getSaveSlots();

        expect(slots).toEqual([]);
      });

      it("logs error and returns empty array when localStorage contains invalid JSON", async () => {
        storage.set(METADATA_STORAGE_KEY, "invalid json");

        const slots = await saveManager.getSaveSlots();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Failed to load save metadata from localStorage:",
          expect.any(Error),
        );
        expect(slots).toEqual([]);
      });

      it("logs error and returns empty array when localStorage.getItem throws", async () => {
        localStorageMock.getItem.mockImplementation(() => {
          throw new Error("Storage access denied");
        });

        const slots = await saveManager.getSaveSlots();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Failed to load save metadata from localStorage:",
          expect.any(Error),
        );
        expect(slots).toEqual([]);
      });
    });
  });
});
