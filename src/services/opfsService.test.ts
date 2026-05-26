import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as opfsService from "./opfsService";

describe("opfsService deleteFile error path", () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    // vi.resetModules() was removed in Vitest v2
    // Dynamic import on line 27 handles module reloading
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("navigator", originalNavigator);
  });

  it("handles removeEntry throwing a generic error", async () => {
    const mockRemoveEntry = vi.fn().mockRejectedValue(new Error("Generic disk error"));

    vi.stubGlobal("navigator", {
      storage: {
        getDirectory: vi.fn().mockResolvedValue({
          removeEntry: mockRemoveEntry,
        }),
      },
    });

    const freshOpfsService = await import("./opfsService");
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
