/**
 * indexedDbService.test.ts — Tests for the IndexedDB storage service.
 *
 * Uses a minimal in-memory IDB mock since jsdom does not implement IndexedDB.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveBuckets,
  loadBuckets,
  clearDatabase,
  hasSavedState,
  _resetForTest,
  type AllBuckets,
} from "@/services/storage/indexedDbService";

// ─── Minimal in-memory IDB mock ─────────────────────────────────────────────

class MockIDBRequest {
  result: unknown;
  error: unknown = null;
  onsuccess: ((ev: any) => void) | null = null;
  onerror: ((ev: any) => void) | null = null;

  constructor(result: unknown) {
    this.result = result;
  }

  _fireSuccess() {
    if (this.onsuccess) this.onsuccess({ target: this });
  }
}

class MockObjectStore {
  private data = new Map<string, unknown>();

  get(key: string): MockIDBRequest {
    const req = new MockIDBRequest(this.data.get(key));
    setTimeout(() => req._fireSuccess(), 0);
    return req;
  }
  put(value: unknown, key: string): MockIDBRequest {
    this.data.set(key, value);
    const req = new MockIDBRequest(undefined);
    setTimeout(() => req._fireSuccess(), 0);
    return req;
  }
  getAll(): MockIDBRequest {
    const req = new MockIDBRequest(Array.from(this.data.values()));
    setTimeout(() => req._fireSuccess(), 0);
    return req;
  }
  getAllKeys(): MockIDBRequest {
    const req = new MockIDBRequest(Array.from(this.data.keys()));
    setTimeout(() => req._fireSuccess(), 0);
    return req;
  }
  clear(): MockIDBRequest {
    this.data.clear();
    const req = new MockIDBRequest(undefined);
    setTimeout(() => req._fireSuccess(), 0);
    return req;
  }
  delete(key: string): MockIDBRequest {
    this.data.delete(key);
    const req = new MockIDBRequest(undefined);
    setTimeout(() => req._fireSuccess(), 0);
    return req;
  }
}

class MockTransaction {
  private stores: Record<string, MockObjectStore>;
  private _oncomplete: (() => void) | null = null;
  private _onerror: ((e: any) => void) | null = null;
  oncomplete: ((ev: any) => void) | null = null;
  onerror: ((ev: any) => void) | null = null;

  constructor(names: string[], stores: Record<string, MockObjectStore>) {
    this.stores = {};
    for (const n of names) this.stores[n] = stores[n];
    // Fire oncomplete after all operations settle
    setTimeout(() => {
      if (this.oncomplete) this.oncomplete({ target: this });
    }, 0);
  }
  objectStore(name: string) {
    return this.stores[name];
  }
}

class MockDatabase {
  objectStoreNames = { contains: (_n: string) => true };
  private stores: Record<string, MockObjectStore> = {};

  constructor() {
    for (const name of ["meta", "horses", "races", "npcStables", "market", "history", "saveSlots"]) {
      this.stores[name] = new MockObjectStore();
    }
  }

  transaction(names: string | string[]) {
    const arr = Array.isArray(names) ? names : [names];
    return new MockTransaction(arr, this.stores);
  }

  createObjectStore(name: string) {
    this.stores[name] = new MockObjectStore();
  }
}

function installIdbMock() {
  const db = new MockDatabase();

  const openRequest = {
    result: db,
    error: null,
    onsuccess: null as null | (() => void),
    onerror: null as null | (() => void),
    onupgradeneeded: null as null | (() => void),
  };

  (globalThis as any).indexedDB = {
    open: vi.fn(() => {
      setTimeout(() => {
        if (openRequest.onupgradeneeded) openRequest.onupgradeneeded();
        if (openRequest.onsuccess) openRequest.onsuccess();
      }, 0);
      return openRequest;
    }),
  };

  return db;
}

function removeIdbMock() {
  delete (globalThis as any).indexedDB;
}

describe("indexedDbService", () => {
  beforeEach(() => {
    _resetForTest();
    removeIdbMock();
  });

  it("round-trips all buckets through IDB", async () => {
    installIdbMock();

    const buckets: Partial<AllBuckets> = {
      meta: { day: 42, cash: 100000 },
      horses: {
        playerHorses: { "h1": { id: "h1", name: "Test" } as any },
        npcSummaries: [],
      },
      races: { "r1": { id: "r1" } as any },
      npcStables: { "s1": { id: "s1" } as any },
      market: { auctions: [] },
      history: { log: [{ day: 1, text: "test" }] },
    };

    await saveBuckets(buckets);
    const loaded = await loadBuckets();

    expect(loaded).not.toBeNull();
    expect(loaded!.meta).toEqual({ day: 42, cash: 100000 });
    expect(loaded!.horses.playerHorses["h1"]).toBeDefined();
    expect(loaded!.races["r1"]).toBeDefined();
    expect(loaded!.npcStables["s1"]).toBeDefined();
    expect(loaded!.market).toEqual({ auctions: [] });
    expect(loaded!.history).toEqual({ log: [{ day: 1, text: "test" }] });
  });

  it("returns null when no data is stored", async () => {
    installIdbMock();
    const loaded = await loadBuckets();
    expect(loaded).toBeNull();
  });

  it("clears all data on clearDatabase", async () => {
    installIdbMock();

    await saveBuckets({ meta: { day: 1 } });
    expect(await hasSavedState()).toBe(true);

    await clearDatabase();
    expect(await hasSavedState()).toBe(false);
  });

  it("returns null when IndexedDB is not available", async () => {
    removeIdbMock();
    const loaded = await loadBuckets();
    expect(loaded).toBeNull();
  });

  it("hasSavedState returns false when IDB is unavailable", async () => {
    removeIdbMock();
    expect(await hasSavedState()).toBe(false);
  });
});
