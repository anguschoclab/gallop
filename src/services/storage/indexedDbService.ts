/**
 * indexedDbService.ts - IndexedDB-based structured storage for hot game-state buckets.
 *
 * Replaces the monolithic OPFS JSON blob with per-bucket object stores so that
 * load/save can target only the data that changed, reducing parse time and
 * payload size.
 */

import type { Horse } from "@/core/horse/types";
import type { Stable } from "@/core/stable/types";
import type { Race } from "@/core/race/types";
import type { NpcHorseSummary } from "@/core/persistence/npcCompression";
import type { GameState } from "@/game/types";

const DB_NAME = "gallop_state_v3";
const DB_VERSION = 2;

export interface MetaBucket {
  [key: string]: unknown;
}

export interface HorsesBucket {
  playerHorses: Record<string, Horse>;
  npcSummaries: NpcHorseSummary[];
}

export interface RacesBucket {
  [raceId: string]: Race;
}

export interface NpcStablesBucket {
  [stableId: string]: Stable;
}

export interface MarketBucket {
  [key: string]: unknown;
}

export interface HistoryBucket {
  [key: string]: unknown[];
}

export interface AllBuckets {
  meta: MetaBucket;
  horses: HorsesBucket;
  races: RacesBucket;
  npcStables: NpcStablesBucket;
  market: MarketBucket;
  history: HistoryBucket;
}

type StoreName = "meta" | "horses" | "races" | "npcStables" | "market" | "history" | "saveSlots";

const STORE_NAMES: StoreName[] = ["meta", "horses", "races", "npcStables", "market", "history", "saveSlots"];

let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of STORE_NAMES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name);
        }
      }
    };
  });

  return dbInitPromise;
}

function txGet<T>(storeName: StoreName, key: string): Promise<T | undefined> {
  return openDatabase().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const req = tx.objectStore(storeName).get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      }),
  );
}

function txPut(storeName: StoreName, key: string, value: unknown): Promise<void> {
  return openDatabase().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

function txGetAll<T>(storeName: StoreName): Promise<T[]> {
  return openDatabase().then(
    (db) =>
      new Promise<T[]>((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result as T[]);
        req.onerror = () => reject(req.error);
      }),
  );
}

function txGetAllKeys(storeName: StoreName): Promise<IDBValidKey[]> {
  return openDatabase().then(
    (db) =>
      new Promise<IDBValidKey[]>((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const req = tx.objectStore(storeName).getAllKeys();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

function txClear(storeName: StoreName): Promise<void> {
  return openDatabase().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

const META_KEY = "meta";
const HORSES_KEY = "horses";
const RACES_KEY = "races";
const NPC_STABLES_KEY = "npcStables";
const MARKET_KEY = "market";
const HISTORY_KEY = "history";

export async function saveBuckets(buckets: Partial<AllBuckets>): Promise<void> {
  const tasks: Promise<void>[] = [];

  if (buckets.meta) {
    tasks.push(txPut("meta", META_KEY, buckets.meta));
  }
  if (buckets.horses) {
    tasks.push(txPut("horses", HORSES_KEY, buckets.horses));
  }
  if (buckets.races) {
    tasks.push(txPut("races", RACES_KEY, buckets.races));
  }
  if (buckets.npcStables) {
    tasks.push(txPut("npcStables", NPC_STABLES_KEY, buckets.npcStables));
  }
  if (buckets.market) {
    tasks.push(txPut("market", MARKET_KEY, buckets.market));
  }
  if (buckets.history) {
    tasks.push(txPut("history", HISTORY_KEY, buckets.history));
  }

  await Promise.all(tasks);
}

export async function loadBuckets(): Promise<AllBuckets | null> {
  if (!isIndexedDBAvailable()) return null;

  try {
    const [meta, horses, races, npcStables, market, history] = await Promise.all([
      txGet<MetaBucket>("meta", META_KEY),
      txGet<HorsesBucket>("horses", HORSES_KEY),
      txGet<RacesBucket>("races", RACES_KEY),
      txGet<NpcStablesBucket>("npcStables", NPC_STABLES_KEY),
      txGet<MarketBucket>("market", MARKET_KEY),
      txGet<HistoryBucket>("history", HISTORY_KEY),
    ]);

    if (!meta && !horses && !races && !npcStables && !market && !history) {
      return null;
    }

    return {
      meta: meta ?? {},
      horses: horses ?? { playerHorses: {}, npcSummaries: [] },
      races: races ?? {},
      npcStables: npcStables ?? {},
      market: market ?? {},
      history: history ?? {},
    };
  } catch (error) {
    console.error("Failed to load buckets from IndexedDB:", error);
    return null;
  }
}

export async function clearDatabase(): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  await Promise.all(STORE_NAMES.map((name) => txClear(name)));
}

export async function hasSavedState(): Promise<boolean> {
  if (!isIndexedDBAvailable()) return false;

  try {
    const meta = await txGet<MetaBucket>("meta", META_KEY);
    return !!meta;
  } catch {
    return false;
  }
}

export function _resetForTest(): void {
  dbInstance = null;
  dbInitPromise = null;
}

function txDelete(storeName: StoreName, key: string): Promise<void> {
  return openDatabase().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

export async function saveSlotState(slotId: string, state: GameState): Promise<void> {
  await txPut("saveSlots", slotId, state);
}

export async function loadSlotState<T = GameState>(slotId: string): Promise<T | null> {
  const result = await txGet<T>("saveSlots", slotId);
  return result ?? null;
}

export async function deleteSlotState(slotId: string): Promise<void> {
  await txDelete("saveSlots", slotId);
}

export { isIndexedDBAvailable as isIndexedDbAvailable };
