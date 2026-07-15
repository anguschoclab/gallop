import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInitOPFS = vi.fn();
const mockWriteFile = vi.fn();
const mockReadFile = vi.fn();
const mockDeleteFile = vi.fn();

vi.mock("@/services/storage/opfsService", () => ({
  initOPFS: mockInitOPFS,
  writeFile: mockWriteFile,
  readFile: mockReadFile,
  deleteFile: mockDeleteFile,
}));

let capturedApi: any;

vi.mock("comlink", () => ({
  expose: vi.fn((api: any) => {
    capturedApi = api;
  }),
}));

import { expose } from "comlink";

describe("storage.worker", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    mockInitOPFS.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue(null);
    mockDeleteFile.mockResolvedValue(undefined);

    // Re-import the worker to get fresh state and capture the exposed API
    await import("@/workers/storage.worker");
    expect(capturedApi).toBeDefined();
  });

  describe("initializeStorage", () => {
    it("caches initialization: initOPFS called once across two calls", async () => {
      await capturedApi.loadGameState();
      await capturedApi.loadGameState();

      expect(mockInitOPFS).toHaveBeenCalledTimes(1);
    });

    it("catches initOPFS error, sets opfsInitialized = true, does not retry", async () => {
      mockInitOPFS.mockRejectedValueOnce(new Error("OPFS unavailable"));

      // After fix: should not throw, should cache initialized state
      await capturedApi.loadGameState();

      // Second call should not retry initOPFS
      mockInitOPFS.mockClear();
      mockReadFile.mockResolvedValue(null);
      await capturedApi.loadGameState();
      expect(mockInitOPFS).not.toHaveBeenCalled();
    });
  });

  describe("loadGameState try/catch", () => {
    it("success: returns state from readFile", async () => {
      const mockState = { day: 5, cash: 50000 } as any;
      mockReadFile.mockResolvedValue(mockState);

      const result = await capturedApi.loadGameState();

      expect(result).toEqual(mockState);
    });

    it("file not found: readFile returns null, returns null, no console.error", async () => {
      mockReadFile.mockResolvedValue(null);
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await capturedApi.loadGameState();

      expect(result).toBeNull();
      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it("error swallowed: readFile rejects, returns null, console.error called", async () => {
      mockReadFile.mockRejectedValue(new Error("Read failed"));
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await capturedApi.loadGameState();

      expect(result).toBeNull();
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it("correct filename: readFile called with gameState.json", async () => {
      mockReadFile.mockResolvedValue(null);

      await capturedApi.loadGameState();

      expect(mockReadFile).toHaveBeenCalledWith("gameState.json");
    });
  });

  describe("saveGameState try/catch", () => {
    it("success: writeFile resolves, no throw", async () => {
      const state = { day: 1 } as any;

      await expect(capturedApi.saveGameState(state)).resolves.toBeUndefined();
    });

    it("error re-thrown: writeFile rejects, re-throws, console.error called", async () => {
      mockWriteFile.mockRejectedValue(new Error("Write failed"));
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(capturedApi.saveGameState({} as any)).rejects.toThrow("Write failed");
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it("correct filename and state passed to writeFile", async () => {
      const state = { day: 10, cash: 999 } as any;

      await capturedApi.saveGameState(state);

      expect(mockWriteFile).toHaveBeenCalledWith("gameState.json", state);
    });

    it("initOPFS called before writeFile", async () => {
      const callOrder: string[] = [];
      mockInitOPFS.mockImplementation(async () => {
        callOrder.push("init");
      });
      mockWriteFile.mockImplementation(async () => {
        callOrder.push("write");
      });

      await capturedApi.saveGameState({} as any);

      expect(callOrder).toEqual(["init", "write"]);
    });
  });

  describe("clearGameState try/catch", () => {
    it("success: deleteFile resolves, no throw", async () => {
      await expect(capturedApi.clearGameState()).resolves.toBeUndefined();
    });

    it("error re-thrown: deleteFile rejects, re-throws, console.error called", async () => {
      mockDeleteFile.mockRejectedValue(new Error("Delete failed"));
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(capturedApi.clearGameState()).rejects.toThrow("Delete failed");
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it("correct filename: deleteFile called with gameState.json", async () => {
      await capturedApi.clearGameState();

      expect(mockDeleteFile).toHaveBeenCalledWith("gameState.json");
    });

    it("initOPFS called before deleteFile", async () => {
      const callOrder: string[] = [];
      mockInitOPFS.mockImplementation(async () => {
        callOrder.push("init");
      });
      mockDeleteFile.mockImplementation(async () => {
        callOrder.push("delete");
      });

      await capturedApi.clearGameState();

      expect(callOrder).toEqual(["init", "delete"]);
    });
  });

  describe("expose()", () => {
    it("captured API has loadGameState, saveGameState, clearGameState functions", () => {
      expect(typeof capturedApi.loadGameState).toBe("function");
      expect(typeof capturedApi.saveGameState).toBe("function");
      expect(typeof capturedApi.clearGameState).toBe("function");
    });
  });
});
