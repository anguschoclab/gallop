# Megaplan Review Notes (working)

Running findings ledger. Verdicts: BUG (fix in Phase 4), SMELL (note only), OVERLAP (a PR addresses it), APPROVED (architecture finding).

## src/shared

- `shared/common/rng.ts` — clean. mulberry32 + FNV-1a; `nondeterministicRng` uses crypto.getRandomValues (Sentinel intent satisfied). APPROVED.
- `shared/common/random.ts` — clean, trivial wrapper.
- `shared/common/arrayHelpers.ts` — clean.
- `shared/common/math.ts` — clean (clamp/clampStat/clampPotential).
- `shared/common/result.ts` — clean.
- `shared/common/formatting.ts` — clean; `formatClockTime` pad/precision verified.
- `shared/common/logHelpers.ts` — clean.
- `shared/common/ordinal.ts` — clean (negative-modulo trick verified for 11/12/13/111).
- `shared/common/types.ts` — clean (Rng re-export, Allele/Locus).
- `shared/common/uiTokens.ts` — NOTED: shared layer imports domain types (`LetterGrade`, `StableTier`, `StaffTier`, `TrackCondition`, `ReputationTier`). Type-only so exempt from layering rules, but shared vocabulary is not self-contained. SMELL.
- `shared/common/countryFlag.ts` — clean.
- `shared/common/classBonus.ts` — clean.
- `shared/types/branded.ts` — **ARCHITECTURE FINDING**: `Brand<T,_B> = T` structural aliases — brands provide zero nominal protection (documented as intentional: nominal branding broke thousands of sites). All `as*` casts are cosmetic. This means Anvil's "branded ID" PRs are style-only. APPROVED-as-documented; note in findings.
- `shared/uuid/uuid.ts` — **BUG-1**: `generateUUIDWithValidation` (line ~169) is dead code containing a CommonJS `require("./uuidRegistry")` — would throw ReferenceError if ever called in ESM/browser bundle. Fix: delete the function.
- `shared/uuid/uuidProvider.ts` — clean (pool auto-expansion verified).
- `shared/uuid/uuidRegistry.ts` — NOTED: only referenced by its own test + dead `generateUUIDWithValidation`. Registry is harmless infrastructure; keep file+test, delete dead caller. SMELL(dead-ish).
- assets/*.png|jpg|svg (≈60) — ASSET (not deep-read; verified referenced by portrait/narrative code where relevant).
- `shared/data/pedigreeData.ts` (14.5k+ LOC), tracks.json, namePools.json, cashPressureTuning.json, syndicationTuning.json — DATA (generated/static; header + accessor checked).

## src/platform (in progress)

- `engine/client.ts`, `engine/engine.ts`, `engine/protocol.ts`, `engine/transports.ts`, `engine/workerPool.ts` — APPROVED. Exactly-once terminal events, revision authority, stale_base_revision rejection, retained-world, cooperative cancel, deterministic pool merge order. Exemplary.
- `game/store/engineSync.ts` — APPROVED w/ note: identity-check only iterates committedWorld's keys; a store-only added GameState field not present in the committed snapshot wouldn't gate sync (bounded — such a field would be new). SESSION_KEYS/UNSYNCED_FIELDS documented.
- `time/checksum.ts` — clean FNV-1a canonical fold. SMELL: `engineGeneration` is in TRANSIENT_STATE_KEYS (persistence) and SESSION_KEYS (sync) but NOT in checksum EXCLUDED_KEYS — a world identical except engine-generation (post-restart) checksums differently. Bounded (fingerprint runs always gen-0), worth noting.
- `time/executor.ts` — APPROVED. Per-day `withUuidStream(createRng(hashStr(uuid_${newDay})))`, cadence gating, interruption/cancel at day boundaries, year-rollover WayQI filter.
- `time/advancePlan.ts`, `scheduler.ts`, `pipeline.ts` — APPROVED. Kahn topo-sort w/ write-conflict ordering validation, dependency/product validation, deterministic tie-break.
- `game/store/engineClient.ts`, `postCommit.ts` — APPROVED. Worker crash → failAll + in-process fallback; postCommit idempotent by kind:revN.
- `game/store/stateVersion.ts` — STORE_STATE_VERSION=11, hard-reset confirmed.
- `game/store/persistedKeys.ts` — APPROVED. TRANSIENT_STATE_KEYS correctly excludes engine*/execution/pendingIntents; META_KEYS derived (no drift).
- `persistence/npcCompression.ts` — **BUG-2**: `regenerateNpcHorses` regenerates from `hashStr(id)` seed and restores history/career/stud fields, but `generateNpcHorse` hard-sets `energy:100, form:50, fitness:50` (and fatigue/recoveryPoints/training state) — never restored. Every reload resets all NPC horses' energy/fitness/fatigue/form → save/load fidelity loss + Banister chronic-load wipe. Fix: persist+restore these fields in NpcHorseSummary.
- `persistence/storage/saveManager.ts`, `schemas.ts` — clean. Zod structural validation + passthrough; slot CRUD correct. NOTE: loadFromSlot does window.location.reload() — acceptable design.
- `time/advance.ts`, `time/calendar.ts` — clean.
- Docstring drift pattern: many headers still cite pre-relocation paths (@/core/..., src/game/...). SMELL class — cosmetic only; note once.
- shared/data/{gradedRaces,stallionDNAData,pedigreeData,realWorldRecords,trackSchedules,trackToCountry}.ts — DATA (headers verified, data rows not audited line-by-line).
- shared/assets/narrative/*.ts — clean template string tables; templates.ts barrel consistent; NOTED `EXPERT_INSIGHT: []` and `JOCKEY_TRAIT: []` empty entries — verify consumers handle empty (check commentaryGenerator).
- shared/ui/* (33 primitives) — vendored shadcn/Radix, scanned for anomalies (none); clean.
- shared/data/jargon.ts, jockeys.ts, personalityTraits.ts, accessors/* — clean.
