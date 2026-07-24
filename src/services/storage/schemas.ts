import { z } from "zod";

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Parse JSON and validate against a Zod schema. Returns null on parse or validation failure.
 *
 * @param raw - Raw JSON string to parse.
 * @param schema - Zod schema to validate the parsed data against.
 * @returns Validated data of type T, or null if parsing or validation fails.
 */
export function safeParseJson<T>(raw: string, schema: z.ZodSchema<T>): T | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error("safeParseJson: JSON.parse failed:", e);
    return null;
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    console.error("safeParseJson: schema validation failed:", result.error.issues);
    return null;
  }
  return result.data;
}

// ─── GameState structural schema ─────────────────────────────────────────────

export const gameStateSchema = z
  .object({
    // CoreState (required)
    day: z.number(),
    cash: z.number(),
    horses: z.record(z.string(), z.unknown()),
    races: z.record(z.string(), z.unknown()),
    log: z.array(z.object({ day: z.number(), text: z.string() })),
    news: z.array(z.unknown()),
    inbox: z.array(z.unknown()),
    seasonRecords: z.array(z.unknown()),
    hallOfFame: z.array(z.unknown()),
    archive: z.object({
      horses: z.array(z.unknown()),
      races: z.array(z.unknown()),
      pregnancies: z.array(z.unknown()),
      news: z.array(z.unknown()),
    }),
    transactions: z.array(z.unknown()),
    expenses: z.array(z.unknown()),

    // MarketState (required)
    market: z.array(z.unknown()),
    scoutReports: z.array(z.unknown()),
    privateSaleOffers: z.array(z.unknown()),
    claims: z.array(z.unknown()),

    // BreedingState (required)
    pregnancies: z.array(z.unknown()),
    activeBreedingProgram: z.unknown().nullable(),
    syndicates: z.record(z.string(), z.unknown()),
    syndicateInvestors: z.record(z.string(), z.unknown()),

    // RacingState (required)
    trainingUsed: z.record(z.string(), z.number()),
    playerNominations: z.array(z.unknown()),

    // SystemsState (required)
    npcStables: z.array(z.unknown()),
    breedingPrograms: z.array(z.unknown()),
    awards: z.array(z.unknown()),
    usedHorseNames: z.array(z.string()),
    usedJockeyNames: z.array(z.string()),
    reservedHorseNames: z.array(z.unknown()),
    stewardsInquiries: z.array(z.unknown()),
    staffPool: z.array(z.unknown()),
    hiredStaff: z.array(z.unknown()),

    // Optional fields (all SystemsState/RacingState/MarketState optionals)
    auctions: z.array(z.unknown()).optional(),
    jockeys: z.array(z.unknown()).optional(),
    campaigns: z.array(z.unknown()).optional(),
    triplecrownHistory: z.array(z.unknown()).optional(),
    facilities: z.unknown().optional(),
    npcFacilities: z.record(z.string(), z.unknown()).optional(),
    userSettings: z.unknown().optional(),
    replays: z.array(z.unknown()).optional(),
    reputation: z.unknown().optional(),
    transports: z.array(z.unknown()).optional(),
    pendingIntents: z.array(z.unknown()).optional(),
    pendingPlayerRaceId: z.string().optional(),
    trackRecords: z.record(z.string(), z.unknown()).optional(),
    horseLeaderboards: z.record(z.string(), z.unknown()).optional(),
    founders: z.record(z.string(), z.unknown()).optional(),
    lastFounderUpdateDay: z.number().optional(),
    shareTransactions: z.array(z.unknown()).optional(),
    shareActivityFeed: z.array(z.unknown()).optional(),
    playerProfile: z.unknown().optional(),
    outposts: z.array(z.unknown()).optional(),
    weather: z.unknown().optional(),
    narrativeArcs: z.record(z.string(), z.unknown()).optional(),
    lastTopTenRank: z.number().optional(),
    npcAIManager: z.unknown().optional(),
    paceSamples: z.record(z.string(), z.array(z.number())).optional(),
    calibratedPars: z.record(z.string(), z.number()).optional(),
    lastCalibrationDay: z.number().optional(),
    industryMeanEarnings: z.number().optional(),
    industryEarningsUpdatedDay: z.number().optional(),
    sireLeaderboards: z.record(z.string(), z.unknown()).optional(),
    sireTrendHistory: z.array(z.unknown()).optional(),
    leaderboardsUpdatedDay: z.number().optional(),
    damsireLeaderboard: z.unknown().optional(),
    blueHenLeaderboard: z.unknown().optional(),
    lastAwardYear: z.record(z.string(), z.number()).optional(),
    pendingAwardCeremonies: z.array(z.unknown()).optional(),
    currentCeremonyIndex: z.number().optional(),
  })
  .passthrough();

// ─── WizardState ─────────────────────────────────────────────────────────────

export const wizardStateSchema = z.object({
  step: z.number(),
  stableName: z.string(),
  ownerName: z.string(),
  silk: z.object({
    pattern: z.string(),
    primary: z.string(),
    secondary: z.string(),
    cap: z.string(),
  }),
  backstoryId: z.string(),
});

// ─── Race filters ────────────────────────────────────────────────────────────

export const raceFiltersSchema = z.record(z.string(), z.string());

// ─── Save slot metadata ──────────────────────────────────────────────────────

export const saveSlotMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  timestamp: z.number(),
  gameDay: z.number(),
  stableName: z.string(),
  cash: z.number(),
  isAutoSave: z.boolean(),
});

export const saveSlotMetadataArraySchema = z.array(saveSlotMetadataSchema);

// ─── Bucket payload (store/storage.ts localStorage fallback) ─────────────────

export const bucketPayloadSchema = z
  .object({
    meta: z.record(z.string(), z.unknown()).optional(),
    horses: z
      .object({
        playerHorses: z.record(z.string(), z.unknown()),
        npcSummaries: z.array(z.unknown()),
      })
      .optional(),
    races: z.record(z.string(), z.unknown()).optional(),
    npcStables: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

// ─── Race progress (sessionStorage) ──────────────────────────────────────────

export const raceProgressSchema = z.object({
  simTime: z.number(),
  paused: z.boolean(),
  speed: z.number(),
});

// ─── Bookmarks ───────────────────────────────────────────────────────────────

export const bookmarkSchema = z.object({
  type: z.enum(["horse", "jockey", "stable", "race", "sire"]),
  id: z.string(),
  label: z.string(),
  subtitle: z.string().optional(),
  tags: z.array(z.string()).optional(),
  addedAt: z.number(),
});

export const bookmarkArraySchema = z.array(bookmarkSchema);

// ─── Analytics events ────────────────────────────────────────────────────────

export const analyticsEventSchema = z.object({
  event: z.string(),
  properties: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.number(),
});

export const analyticsEventArraySchema = z.array(analyticsEventSchema);

// ─── Dismissed stewards inquiries ────────────────────────────────────────────

export const dismissedInquiriesSchema = z.array(z.string());
