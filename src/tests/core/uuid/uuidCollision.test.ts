/**
 * uuidCollision.test.ts
 * 
 * Tests for UUID collision detection at scale.
 * Verifies that generateUUID produces unique values even when generating
 * large numbers of UUIDs.
 */

import { describe, it, expect } from 'vitest';
import { generateUUID } from '@/core/uuid';

describe('UUID Collision Detection at Scale', () => {
  it('should generate 10,000 unique UUIDs without collisions', () => {
    const uuids = new Set<string>();
    const count = 10000;
    
    for (let i = 0; i < count; i++) {
      const uuid = generateUUID();
      expect(uuids.has(uuid)).toBe(false); // Should not have collision
      uuids.add(uuid);
    }
    
    expect(uuids.size).toBe(count);
  });

  it('should generate 1,000 unique UUIDs with deterministic RNG without collisions', () => {
    // Create a simple deterministic RNG
    let seed = 12345;
    const rng = {
      next: () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      },
      int: (min: number, max: number) => min,
      range: (min: number, max: number) => min,
      pick: <T>(arr: readonly T[]) => arr[0],
      gauss: (mean?: number, sd?: number) => mean ?? 0,
    };
    
    const uuids = new Set<string>();
    const count = 1000;
    
    for (let i = 0; i < count; i++) {
      const uuid = generateUUID(rng);
      expect(uuids.has(uuid)).toBe(false); // Should not have collision
      uuids.add(uuid);
    }
    
    expect(uuids.size).toBe(count);
  });

  it('should generate different UUIDs with different RNG seeds', () => {
    const rng1 = {
      next: () => 0.5,
      int: (min: number, max: number) => min,
      range: (min: number, max: number) => min,
      pick: <T>(arr: readonly T[]) => arr[0],
      gauss: (mean?: number, sd?: number) => mean ?? 0,
    };
    
    const rng2 = {
      next: () => 0.7,
      int: (min: number, max: number) => min,
      range: (min: number, max: number) => min,
      pick: <T>(arr: readonly T[]) => arr[0],
      gauss: (mean?: number, sd?: number) => mean ?? 0,
    };
    
    const uuids1 = new Set<string>();
    const uuids2 = new Set<string>();
    
    for (let i = 0; i < 100; i++) {
      uuids1.add(generateUUID(rng1));
      uuids2.add(generateUUID(rng2));
    }
    
    // With constant RNG values, all UUIDs should be the same within each set
    expect(uuids1.size).toBe(1);
    expect(uuids2.size).toBe(1);
    
    // But different RNG values should produce different UUIDs
    const [uuid1] = uuids1;
    const [uuid2] = uuids2;
    expect(uuid1).not.toBe(uuid2);
  });

  it('should maintain UUID v4 format at scale', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const count = 1000;
    
    for (let i = 0; i < count; i++) {
      const uuid = generateUUID();
      expect(uuidRegex.test(uuid)).toBe(true);
    }
  });
});

describe('UUID Per-Entity Type Generation', () => {
  it('should generate unique UUIDs for different entity types', () => {
    const horseUUIDs = new Set<string>();
    const raceUUIDs = new Set<string>();
    const jockeyUUIDs = new Set<string>();
    
    // Generate 100 of each type
    for (let i = 0; i < 100; i++) {
      horseUUIDs.add(generateUUID());
      raceUUIDs.add(generateUUID());
      jockeyUUIDs.add(generateUUID());
    }
    
    // All should be unique
    expect(horseUUIDs.size).toBe(100);
    expect(raceUUIDs.size).toBe(100);
    expect(jockeyUUIDs.size).toBe(100);
    
    // No collisions across types
    const allUUIDs = new Set([...horseUUIDs, ...raceUUIDs, ...jockeyUUIDs]);
    expect(allUUIDs.size).toBe(300);
  });
});
