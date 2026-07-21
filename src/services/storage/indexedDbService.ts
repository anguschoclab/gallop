/**
 * indexedDbService.ts - IndexedDB-based structured storage for hot game-state buckets.
 *
 * Replaces the former monolithic OPFS JSON blob with per-bucket object stores so that
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

export interface AllBuckets {
  meta: MetaBucket;
  horses: HorsesBucket;
  races: RacesBucket;
  npcStables: NpcStablesBucket;
}

type StoreName = "meta" | "horses" | "races" | "npcStables" | "saveSlots";

const STORE_NAMES: StoreName[] = ["meta", "horses", "races", "npcStables", "saveSlots"];

let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

/**
 * Checks whether the IndexedDB API is available in the current environment.
 *
 * @returns {boolean} True if IndexedDB is available.
 */
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

/**
 * Saves one or more game-state buckets to IndexedDB in parallel.
 *
 * @param {Partial<AllBuckets>} buckets - Buckets to save (only non-undefined buckets are written).
 * @returns {Promise<void>}
 */
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

  await Promise.all(tasks);
}

/**
 * Loads all game-state buckets from IndexedDB.
 *
 * @returns {Promise<AllBuckets | null>} All buckets, or null if IndexedDB is unavailable or empty.
 */
export async function loadBuckets(): Promise<AllBuckets | null> {
  if (!isIndexedDBAvailable()) return null;

  try {
    const [meta, horses, races, npcStables] = await Promise.all([
      txGet<MetaBucket>("meta", META_KEY),
      txGet<HorsesBucket>("horses", HORSES_KEY),
      txGet<RacesBucket>("races", RACES_KEY),
      txGet<NpcStablesBucket>("npcStables", NPC_STABLES_KEY),
    ]);

    if (!meta && !horses && !races && !npcStables) {
      return null;
    }

    return {
      meta: meta ?? {},
      horses: horses ?? { playerHorses: {}, npcSummaries: [] },
      races: races ?? {},
      npcStables: npcStables ?? {},
    };
  } catch (error) {
    console.error("Failed to load buckets from IndexedDB:", error);
    return null;
  }
}

/**
 * Clears all object stores in the IndexedDB database.
 *
 * @returns {Promise<void>}
 */
export async function clearDatabase(): Promise<void> {
  if (!isIndexedDBAvailable()) return;

  await Promise.all(STORE_NAMES.map((name) => txClear(name)));
}

/**
 * Checks whether any saved state exists in the meta bucket.
 *
 * @returns {Promise<boolean>} True if a meta bucket entry exists.
 */
export async function hasSavedState(): Promise<boolean> {
  if (!isIndexedDBAvailable()) return false;

  try {
    const meta = await txGet<MetaBucket>("meta", META_KEY);
    return !!meta;
  } catch {
    return false;
  }
}

/**
 * Resets the internal database instance and init promise. Intended for test teardown only.
 */
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

/**
 * Saves a full game state to a named save slot.
 *
 * @param {string} slotId - The save slot identifier.
 * @param {GameState} state - The complete game state to persist.
 * @returns {Promise<void>}
 */
export async function saveSlotState(slotId: string, state: GameState): Promise<void> {
  await txPut("saveSlots", slotId, state);
}

/**
 * Loads a game state from a named save slot.
 *
 * @param {string} slotId - The save slot identifier.
 * @returns {Promise<T | null>} The loaded state, or null if the slot is empty.
 */
export async function loadSlotState<T = GameState>(slotId: string): Promise<T | null> {
  const result = await txGet<T>("saveSlots", slotId);
  return result ?? null;
}

/**
 * Deletes a game state from a named save slot.
 *
 * @param {string} slotId - The save slot identifier.
 * @returns {Promise<void>}
 */
export async function deleteSlotState(slotId: string): Promise<void> {
  await txDelete("saveSlots", slotId);
}

export { isIndexedDBAvailable as isIndexedDbAvailable };
