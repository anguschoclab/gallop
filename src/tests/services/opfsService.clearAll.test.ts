import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

function createMockEntry(name: string, kind: "file" | "directory"): FileSystemHandle {
  return { name, kind } as unknown as FileSystemHandle;
}

function createAsyncIterable(entries: FileSystemHandle[]): AsyncIterable<FileSystemHandle> {
  return {
    [Symbol.asyncIterator]() {
      let i = 0;
      return {
        next(): Promise<IteratorResult<FileSystemHandle>> {
          if (i < entries.length) {
            return Promise.resolve({ value: entries[i++], done: false });
          }
          return Promise.resolve({ value: undefined, done: true });
        },
      };
    },
  };
}

function createFailingAsyncIterable(error: Error): AsyncIterable<FileSystemHandle> {
  return {
    [Symbol.asyncIterator]() {
      return {
        next(): Promise<IteratorResult<FileSystemHandle>> {
          return Promise.reject(error);
        },
      };
    },
  };
}

function setupNavigator(root: any) {
  Object.defineProperty(globalThis, "navigator", {
    value: {
      storage: {
        getDirectory: vi.fn().mockResolvedValue(root),
      },
    },
    writable: true,
    configurable: true,
  });
}

function clearNavigator() {
  Object.defineProperty(globalThis, "navigator", {
    value: undefined,
    writable: true,
    configurable: true,
  });
}

describe("opfsService.clearAll", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearNavigator();
  });

  it("deletes all files in parallel", async () => {
    const callOrder: string[] = [];
    const removeEntry = vi.fn().mockImplementation((name: string) => {
      callOrder.push(`call:${name}`);
      return new Promise<void>((resolve) => {
        // tiny delay so we can verify all calls fire before any resolve
        setTimeout(() => {
          callOrder.push(`resolve:${name}`);
          resolve();
        }, 10);
      });
    });

    const entries = [
      createMockEntry("a.json", "file"),
      createMockEntry("b.json", "file"),
      createMockEntry("c.json", "file"),
    ];

    const root = {
      removeEntry,
      [Symbol.asyncIterator]: () => createAsyncIterable(entries)[Symbol.asyncIterator](),
    };
    setupNavigator(root);

    const fresh = await import("@/services/storage/opfsService?bust=" + Date.now());
    await fresh.initOPFS();

    await fresh.clearAll();

    expect(removeEntry).toHaveBeenCalledTimes(3);
    expect(removeEntry).toHaveBeenCalledWith("a.json");
    expect(removeEntry).toHaveBeenCalledWith("b.json");
    expect(removeEntry).toHaveBeenCalledWith("c.json");

    // All calls should fire before any resolve — proving parallelism
    const firstResolveIdx = callOrder.findIndex((c) => c.startsWith("resolve:"));
    const lastCallIdx = callOrder
      .map((c) => c)
      .lastIndexOf(callOrder.find((c) => c.startsWith("call:c.json"))!);
    expect(firstResolveIdx).toBeGreaterThan(lastCallIdx);
  });

  it("does nothing when OPFS unavailable", async () => {
    clearNavigator();

    const fresh = await import("@/services/storage/opfsService?bust=" + Date.now() + "unavail");
    await fresh.initOPFS();

    const removeEntry = vi.fn();

    await fresh.clearAll();

    expect(removeEntry).not.toHaveBeenCalled();
  });

  it("handles empty directory without calling removeEntry", async () => {
    const removeEntry = vi.fn();
    const entries: FileSystemHandle[] = [];

    const root = {
      removeEntry,
      [Symbol.asyncIterator]: () => createAsyncIterable(entries)[Symbol.asyncIterator](),
    };
    setupNavigator(root);

    const fresh = await import("@/services/storage/opfsService?bust=" + Date.now() + "empty");
    await fresh.initOPFS();

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await fresh.clearAll();

    expect(removeEntry).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("continues deleting after individual removeEntry failure", async () => {
    const removeEntry = vi.fn().mockImplementation((name: string) => {
      if (name === "b.json") {
        return Promise.reject(new Error("Disk error on b"));
      }
      return Promise.resolve();
    });

    const entries = [
      createMockEntry("a.json", "file"),
      createMockEntry("b.json", "file"),
      createMockEntry("c.json", "file"),
    ];

    const root = {
      removeEntry,
      [Symbol.asyncIterator]: () => createAsyncIterable(entries)[Symbol.asyncIterator](),
    };
    setupNavigator(root);

    const fresh = await import("@/services/storage/opfsService?bust=" + Date.now() + "partial");
    await fresh.initOPFS();

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await fresh.clearAll();

    // allSettled means all 3 are attempted
    expect(removeEntry).toHaveBeenCalledTimes(3);
    expect(removeEntry).toHaveBeenCalledWith("a.json");
    expect(removeEntry).toHaveBeenCalledWith("b.json");
    expect(removeEntry).toHaveBeenCalledWith("c.json");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to delete file b.json:",
      expect.any(Error),
    );
  });

  it("handles NotFoundError silently for individual files", async () => {
    const notFoundError = new DOMException("Not found", "NotFoundError");
    const removeEntry = vi.fn().mockImplementation((name: string) => {
      if (name === "missing.json") {
        return Promise.reject(notFoundError);
      }
      return Promise.resolve();
    });

    const entries = [
      createMockEntry("missing.json", "file"),
      createMockEntry("exists.json", "file"),
    ];

    const root = {
      removeEntry,
      [Symbol.asyncIterator]: () => createAsyncIterable(entries)[Symbol.asyncIterator](),
    };
    setupNavigator(root);

    const fresh = await import("@/services/storage/opfsService?bust=" + Date.now() + "notfound");
    await fresh.initOPFS();

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await fresh.clearAll();

    expect(removeEntry).toHaveBeenCalledTimes(2);
    // NotFoundError should NOT trigger console.error
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("handles directory iteration error", async () => {
    const removeEntry = vi.fn();
    const iterError = new Error("Iterator failed");

    const root = {
      removeEntry,
      [Symbol.asyncIterator]: () => createFailingAsyncIterable(iterError)[Symbol.asyncIterator](),
    };
    setupNavigator(root);

    const fresh = await import("@/services/storage/opfsService?bust=" + Date.now() + "itererr");
    await fresh.initOPFS();

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await fresh.clearAll();

    expect(removeEntry).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to clear OPFS:", expect.any(Error));
  });

  it("skips directory entries (only deletes files)", async () => {
    const removeEntry = vi.fn().mockResolvedValue(undefined);

    const entries = [createMockEntry("data.json", "file"), createMockEntry("subdir", "directory")];

    const root = {
      removeEntry,
      [Symbol.asyncIterator]: () => createAsyncIterable(entries)[Symbol.asyncIterator](),
    };
    setupNavigator(root);

    const fresh = await import("@/services/storage/opfsService?bust=" + Date.now() + "dirskip");
    await fresh.initOPFS();

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await fresh.clearAll();

    expect(removeEntry).toHaveBeenCalledTimes(1);
    expect(removeEntry).toHaveBeenCalledWith("data.json");
    expect(removeEntry).not.toHaveBeenCalledWith("subdir");
  });
});
