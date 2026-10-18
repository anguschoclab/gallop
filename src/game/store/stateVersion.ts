/**
 * Current persisted-state schema version. A save whose `storeVersion` does
 * not match is treated as incompatible and cleared on rehydrate — there is
 * no migration path.
 *
 * Kept in a leaf module (no store/side-effect imports) so e2e specs can read
 * the authoritative value when seeding saves without booting the store.
 */
export const STORE_STATE_VERSION = 10;
