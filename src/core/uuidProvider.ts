/**
 * uuidProvider.ts - UUID provider with pre-generation and auto-expansion
 *
 * Provides a pool-based UUID dispenser that pre-generates UUIDs in bulk
 * and auto-expands when exhausted, preserving RNG determinism.
 */

import type { Rng } from "./common/types";
import { generateUUIDBulk } from "./uuid";

export class UUIDProvider {
  private pool: string[];
  private index = 0;

  constructor(
    private readonly rng: Rng | undefined,
    initialPoolSize: number = 128,
  ) {
    this.pool = generateUUIDBulk(rng, initialPoolSize);
  }

  next(): string {
    if (this.index >= this.pool.length) {
      const batchSize = Math.max(64, this.pool.length);
      const newUuids = generateUUIDBulk(this.rng, batchSize);
      for (const uuid of newUuids) {
        this.pool.push(uuid);
      }
    }
    return this.pool[this.index++];
  }

  get remaining(): number {
    return this.pool.length - this.index;
  }
}
