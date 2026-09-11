/**
 * historyService.ts - Re-export from @/core/history/historyService
 *
 * The canonical implementation now lives in core. This re-export keeps
 * existing service importers working during the transition.
 *
 * @deprecated Import from @/core/history/historyService instead.
 */

export {
  recordRaceHistory,
  checkHallOfFameInduction,
  checkTrackRecord,
  ageBucket,
  genderBucket,
  checkTrackRecords,
} from "@/core/history/historyService";
