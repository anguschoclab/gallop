import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as opfsService from "./opfsService";

describe("opfsService deleteFile error path", () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    vi.resetModules();
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

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await freshOpfsService.deleteFile("test.json");

    expect(result).toBe(false);
    expect(mockRemoveEntry).toHaveBeenCalledWith("test.json");
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Could not delete test.json from OPFS:",
      expect.any(Error),
    );
  });
});
