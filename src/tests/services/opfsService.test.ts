import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  initOPFS,
  checkOPFSAvailable,
  writeFile,
  readFile,
  deleteFile,
  listFiles,
  clearAll,
  _resetForTest,
} from "@/services/opfsService";

describe("opfsService", () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    _resetForTest();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("initOPFS", () => {
    it("should warn and return false if navigator.storage is not available", async () => {
      vi.stubGlobal("navigator", {});

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await initOPFS();

      expect(consoleWarnSpy).toHaveBeenCalledWith("OPFS not available in this browser");
      const isAvailable = await checkOPFSAvailable();
      expect(isAvailable).toBe(false);
    });

    it("should warn and return false if navigator.storage.getDirectory is not available", async () => {
      vi.stubGlobal("navigator", { storage: {} });

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await initOPFS();

      expect(consoleWarnSpy).toHaveBeenCalledWith("OPFS not available in this browser");
      const isAvailable = await checkOPFSAvailable();
      expect(isAvailable).toBe(false);
    });

    it("should initialize successfully if OPFS is available", async () => {
      const mockGetDirectory = vi.fn().mockResolvedValue({});
      vi.stubGlobal("navigator", {
        storage: {
          getDirectory: mockGetDirectory,
        },
      });

      await initOPFS();

      expect(mockGetDirectory).toHaveBeenCalled();
      const isAvailable = await checkOPFSAvailable();
      expect(isAvailable).toBe(true);
    });

    it("should handle errors during getDirectory gracefully", async () => {
      const mockGetDirectory = vi.fn().mockRejectedValue(new Error("Storage error"));
      vi.stubGlobal("navigator", {
        storage: {
          getDirectory: mockGetDirectory,
        },
      });

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await initOPFS();

      expect(mockGetDirectory).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to initialize OPFS:", expect.any(Error));
      const isAvailable = await checkOPFSAvailable();
      expect(isAvailable).toBe(false);
    });
  });

  describe("checkOPFSAvailable", () => {
    it("should return the correct availability after initialization", async () => {
      vi.stubGlobal("navigator", {
        storage: {
          getDirectory: vi.fn().mockResolvedValue({}),
        },
      });

      const isAvailable = await checkOPFSAvailable();
      expect(isAvailable).toBe(true);
    });
  });

  describe("file operations", () => {
    let mockRoot: {
      getFileHandle: ReturnType<typeof vi.fn>;
      removeEntry: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
      mockRoot = {
        getFileHandle: vi.fn(),
        removeEntry: vi.fn(),
      };

      (mockRoot as any)[Symbol.asyncIterator] = vi.fn();

      vi.stubGlobal("navigator", {
        storage: {
          getDirectory: vi.fn().mockResolvedValue(mockRoot),
        },
      });

      await initOPFS();
    });

    describe("writeFile", () => {
      it("should write data to a file", async () => {
        const mockWritable = {
          write: vi.fn().mockResolvedValue(undefined),
          close: vi.fn().mockResolvedValue(undefined),
        };
        const mockFileHandle = {
          createWritable: vi.fn().mockResolvedValue(mockWritable),
        };
        mockRoot.getFileHandle.mockResolvedValue(mockFileHandle);

        const testData = { key: "value" };
        await writeFile("test.json", testData);

        expect(mockRoot.getFileHandle).toHaveBeenCalledWith("test.json", { create: true });
        expect(mockFileHandle.createWritable).toHaveBeenCalled();
        expect(mockWritable.write).toHaveBeenCalledWith(JSON.stringify(testData));
        expect(mockWritable.close).toHaveBeenCalled();
      });

      it("should throw error if OPFS is not available", async () => {
        _resetForTest();
        await expect(writeFile("test.json", {})).rejects.toThrow("OPFS not available");
      });

      it("should convert QuotaExceededError", async () => {
        const originalDOMException = global.DOMException;
        global.DOMException = class DOMException extends Error {
          name: string;
          constructor(message: string, name: string) {
            super(message);
            this.name = name;
          }
        } as unknown as typeof DOMException;

        const error = new global.DOMException("Quota exceeded", "QuotaExceededError");
        const mockFileHandle = {
          createWritable: vi.fn().mockRejectedValue(error),
        };
        mockRoot.getFileHandle.mockResolvedValue(mockFileHandle);

        await expect(writeFile("test.json", {})).rejects.toThrow("Storage quota exceeded");

        global.DOMException = originalDOMException;
      });
    });

    describe("readFile", () => {
      it("should read data from a file", async () => {
        const testData = { key: "value" };
        const mockFile = {
          text: vi.fn().mockResolvedValue(JSON.stringify(testData)),
        };
        const mockFileHandle = {
          getFile: vi.fn().mockResolvedValue(mockFile),
        };
        mockRoot.getFileHandle.mockResolvedValue(mockFileHandle);

        const result = await readFile("test.json");

        expect(mockRoot.getFileHandle).toHaveBeenCalledWith("test.json");
        expect(mockFileHandle.getFile).toHaveBeenCalled();
        expect(mockFile.text).toHaveBeenCalled();
        expect(result).toEqual(testData);
      });

      it("should return null if file not found", async () => {
        const originalDOMException = global.DOMException;
        global.DOMException = class DOMException extends Error {
          name: string;
          constructor(message: string, name: string) {
            super(message);
            this.name = name;
          }
        } as unknown as typeof DOMException;

        const error = new global.DOMException("Not found", "NotFoundError");
        mockRoot.getFileHandle.mockRejectedValue(error);

        const result = await readFile("test.json");
        expect(result).toBeNull();

        global.DOMException = originalDOMException;
      });

      it("should return null on other errors and log it", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        mockRoot.getFileHandle.mockRejectedValue(new Error("Some other error"));

        const result = await readFile("test.json");
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Failed to read file test.json:",
          expect.any(Error),
        );
      });

      it("should return null if OPFS is not available", async () => {
        _resetForTest();
        const result = await readFile("test.json");
        expect(result).toBeNull();
      });
    });

    describe("deleteFile", () => {
      it("should delete a file", async () => {
        mockRoot.removeEntry.mockResolvedValue(undefined);
        await deleteFile("test.json");
        expect(mockRoot.removeEntry).toHaveBeenCalledWith("test.json");
      });

      it("should ignore NotFoundError", async () => {
        const originalDOMException = global.DOMException;
        global.DOMException = class DOMException extends Error {
          name: string;
          constructor(message: string, name: string) {
            super(message);
            this.name = name;
          }
        } as unknown as typeof DOMException;

        const error = new global.DOMException("Not found", "NotFoundError");
        mockRoot.removeEntry.mockRejectedValue(error);

        await expect(deleteFile("test.json")).resolves.toBeUndefined();

        global.DOMException = originalDOMException;
      });

      it("should log other errors", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        mockRoot.removeEntry.mockRejectedValue(new Error("Some other error"));

        await deleteFile("test.json");
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Failed to delete file test.json:",
          expect.any(Error),
        );
      });

      it("should do nothing if OPFS is not available", async () => {
        _resetForTest();
        await expect(deleteFile("test.json")).resolves.toBeUndefined();
      });
    });

    describe("listFiles", () => {
      it("should list files in directory", async () => {
        const mockEntries = [
          { kind: "file", name: "test1.json" },
          { kind: "directory", name: "dir1" },
          { kind: "file", name: "test2.json" },
        ];

        (mockRoot as any)[Symbol.asyncIterator] = async function* () {
          yield* [];
          for (const entry of mockEntries) {
            yield entry;
          }
        };

        const result = await listFiles();
        expect(result).toEqual(["test1.json", "test2.json"]);
      });

      it("should return empty array and log error if iteration fails", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        (mockRoot as any)[Symbol.asyncIterator] = async function* () {
          yield* [];
          throw new Error("Iterator error");
        };

        const result = await listFiles();
        expect(result).toEqual([]);
        expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to list files:", expect.any(Error));
      });

      it("should return empty array if OPFS is not available", async () => {
        _resetForTest();
        const result = await listFiles();
        expect(result).toEqual([]);
      });
    });

    describe("clearAll", () => {
      it("should clear all files", async () => {
        const mockEntries = [
          { kind: "file", name: "test1.json" },
          { kind: "directory", name: "dir1" },
          { kind: "file", name: "test2.json" },
        ];

        (mockRoot as any)[Symbol.asyncIterator] = async function* () {
          yield* [];
          for (const entry of mockEntries) {
            yield entry;
          }
        };

        mockRoot.removeEntry.mockResolvedValue(undefined);

        await clearAll();

        expect(mockRoot.removeEntry).toHaveBeenCalledTimes(2);
        expect(mockRoot.removeEntry).toHaveBeenCalledWith("test1.json");
        expect(mockRoot.removeEntry).toHaveBeenCalledWith("test2.json");
      });

      it("should log error if deletion fails", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        (mockRoot as any)[Symbol.asyncIterator] = async function* () {
          yield* [];
          yield { kind: "file", name: "test1.json" };
        };

        mockRoot.removeEntry.mockRejectedValue(new Error("Delete error"));

        await clearAll();

        expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to clear OPFS:", expect.any(Error));
      });

      it("should do nothing if OPFS is not available", async () => {
        _resetForTest();
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        await clearAll();
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });
    });
  });
});
