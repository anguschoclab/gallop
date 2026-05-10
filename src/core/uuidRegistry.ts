/**
 * uuidRegistry.ts - UUID collision detection and tracking system
 *
 * This file provides a registry system to track all used UUIDs and prevent
 * collisions during entity creation. It maintains per-entity-type tracking
 * and provides collision detection capabilities.
 *
 * Dependencies: None
 * Related files: Used by uuid.ts for validation during UUID generation
 */

/**
 * UUID Registry class for tracking and validating UUID uniqueness.
 *
 * This registry maintains a set of all registered UUIDs and their associated
 * entity types to prevent collisions during entity creation.
 */
class UUIDRegistry {
  private uuids: Map<string, string> = new Map(); // UUID -> entity type
  private entityTypes: Map<string, Set<string>> = new Map(); // entity type -> Set of UUIDs

  /**
   * Register a UUID with its associated entity type.
   *
   * @param uuid - The UUID to register
   * @param entityType - The type of entity (e.g., 'horse', 'race', 'jockey')
   * @throws Error if the UUID is already registered
   */
  register(uuid: string, entityType: string): void {
    if (this.uuids.has(uuid)) {
      const existingType = this.uuids.get(uuid);
      throw new Error(
        `UUID collision detected: ${uuid} is already registered as type '${existingType}'. Attempted to register as '${entityType}'.`
      );
    }

    this.uuids.set(uuid, entityType);

    if (!this.entityTypes.has(entityType)) {
      this.entityTypes.set(entityType, new Set());
    }
    this.entityTypes.get(entityType)!.add(uuid);
  }

  /**
   * Check if a UUID is already registered.
   *
   * @param uuid - The UUID to check
   * @returns True if the UUID is already registered
   */
  isRegistered(uuid: string): boolean {
    return this.uuids.has(uuid);
  }

  /**
   * Get the entity type associated with a UUID.
   *
   * @param uuid - The UUID to look up
   * @returns The entity type, or undefined if not registered
   */
  getEntityType(uuid: string): string | undefined {
    return this.uuids.get(uuid);
  }

  /**
   * Get all UUIDs registered for a specific entity type.
   *
   * @param entityType - The entity type to query
   * @returns Set of UUIDs for the entity type
   */
  getUUIDsByType(entityType: string): Set<string> {
    return this.entityTypes.get(entityType) || new Set();
  }

  /**
   * Get the total count of registered UUIDs.
   *
   * @returns Total number of registered UUIDs
   */
  getCount(): number {
    return this.uuids.size;
  }

  /**
   * Get the count of registered UUIDs for a specific entity type.
   *
   * @param entityType - The entity type to query
   * @returns Number of UUIDs for the entity type
   */
  getCountByType(entityType: string): number {
    return this.getUUIDsByType(entityType).size;
  }

  /**
   * Clear all registered UUIDs.
   *
   * This is primarily used for testing or resetting the registry.
   */
  clear(): void {
    this.uuids.clear();
    this.entityTypes.clear();
  }

  /**
   * Export the registry state for debugging or serialization.
   *
   * @returns Object containing all registered UUIDs and their types
   */
  export(): Record<string, string> {
    const result: Record<string, string> = {};
    this.uuids.forEach((entityType, uuid) => {
      result[uuid] = entityType;
    });
    return result;
  }

  /**
   * Import UUIDs into the registry from an exported state.
   *
   * @param data - Object containing UUIDs and their entity types
   * @throws Error if any UUID is already registered
   */
  import(data: Record<string, string>): void {
    for (const [uuid, entityType] of Object.entries(data)) {
      this.register(uuid, entityType);
    }
  }

  /**
   * Get statistics about the registry.
   *
   * @returns Object with registry statistics
   */
  getStats(): { total: number; byType: Record<string, number> } {
    const stats: Record<string, number> = {};
    this.entityTypes.forEach((uuids, entityType) => {
      stats[entityType] = uuids.size;
    });
    return {
      total: this.uuids.size,
      byType: stats,
    };
  }
}

// Global singleton instance
const registry = new UUIDRegistry();

// Export the singleton instance and class for testing
export { registry, UUIDRegistry };

// Export convenience functions
export const register = (uuid: string, entityType: string) => registry.register(uuid, entityType);
export const isRegistered = (uuid: string) => registry.isRegistered(uuid);
export const getEntityType = (uuid: string) => registry.getEntityType(uuid);
export const getUUIDsByType = (entityType: string) => registry.getUUIDsByType(entityType);
export const getRegistryCount = () => registry.getCount();
export const getRegistryCountByType = (entityType: string) => registry.getCountByType(entityType);
export const clearRegistry = () => registry.clear();
export const exportRegistry = () => registry.export();
export const importRegistry = (data: Record<string, string>) => registry.import(data);
export const getRegistryStats = () => registry.getStats();
