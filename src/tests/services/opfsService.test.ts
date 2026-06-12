import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as opfsService from "@/services/storage/opfsService";

describe("opfsService deleteFile error path", () => {
  beforeEach(() => {
    // vi.resetModules() was removed in Vitest v2
    // Dynamic import on line 27 handles module reloading
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, "navigator", {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  it("handles removeEntry throwing a generic error", async () => {
    const mockRemoveEntry = vi.fn().mockRejectedValue(new Error("Generic disk error"));

    Object.defineProperty(globalThis, "navigator", {
      value: {
        storage: {
          getDirectory: vi.fn().mockResolvedValue({
            removeEntry: mockRemoveEntry,
          }),
        },
      },
      writable: true,
      configurable: true,
    });

    // Use cache-busting query to get a fresh module instance (bun shares module cache across test files)
    const freshOpfsService = await import("@/services/storage/opfsService?bust=" + Date.now());
    await freshOpfsService.initOPFS();

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await freshOpfsService.deleteFile("test.json");

    expect(result).toBeUndefined();
    expect(mockRemoveEntry).toHaveBeenCalledWith("test.json");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to delete file test.json:",
      expect.any(Error),
    );
  });
});
