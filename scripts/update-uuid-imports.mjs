#!/usr/bin/env node

/**
 * update-uuid-imports.mjs
 *
 * This script updates all imports from deprecated UUID utilities to the new centralized utility.
 * Replaces @/game/uuid and @/core/common/uuid with @/core/uuid
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filesToUpdate = [
  "./src/services/claimingResolutionService.ts",
  "./src/services/newsGenerator.ts",
  "./src/services/historyService.ts",
  "./src/services/raceImpactGenerator.ts",
  "./src/__tests__/syndication.test.ts",
  "./src/game/store/slices/privateSaleSlice.ts",
  "./src/game/store/slices/facilitySlice.ts",
  "./src/game/store/slices/horseAdminSlice.ts",
  "./src/game/store/slices/breedingSlice.ts",
  "./src/game/store/slices/scoutingSlice.ts",
  "./src/game/store/slices/campaignSlice.ts",
  "./src/game/store/slices/auctionSlice.ts",
  "./src/game/store/slices/marketSlice.ts",
  "./src/game/store/slices/coreSlice.ts",
  "./src/game/store/slices/racingSlice.ts",
  "./src/game/store/slices/jockeySlice.ts",
  "./src/game/liveRaceResolution.ts",
  "./src/game/raceGeneration/asia.ts",
  "./src/game/jockeyGen.ts",
  "./src/game/raceGeneration/southAmerica.ts",
  "./src/game/state/coreState.ts",
  "./src/game/raceGeneration/europe.ts",
  "./src/game/raceGeneration/australia.ts",
  "./src/game/raceGeneration/raceGen.ts",
  "./src/game/raceGeneration/northAmerica.ts",
  "./src/game/npcBreeding.ts",
  "./src/game/auction.ts",
  "./src/core/resolver/handlers/MarketHandler.ts",
  "./src/core/resolver/resolvers/syndicateResolver.ts",
  "./src/core/npc/intentGenerators.ts",
  "./src/core/health/healthSystem.ts",
  "./src/core/staff/staffGenerator.ts",
  "./src/core/time/phases/breedingResolution.ts",
  "./src/core/time/phases/claimingWithdrawal.ts",
  "./src/core/time/phases/trainingResolution.ts",
  "./src/core/time/phases/intentCollection.ts",
  "./src/core/time/phases/claimResolution.ts",
  "./src/core/time/phases/hallOfFame.ts",
  "./src/core/time/phases/purchaseResolution.ts",
  "./src/core/time/phases/stallionRetirement.ts",
  "./src/core/time/phases/managementResolution.ts",
  "./src/core/time/phases/raceResolution.ts",
  "./src/core/time/phases/raceEntryResolution.ts",
  "./src/core/time/phases/upkeep.ts",
  "./src/core/time/phases/awards.ts",
  "./src/core/time/phases/auctions.ts",
  "./src/core/time/phases/horseDeath.ts",
  "./src/core/time/phases/npcClaiming.ts",
  "./src/core/time/phases/consignmentResolution.ts",
  "./src/core/time/phases/pastureRetirement.ts",
  "./src/tests/game/uuid.test.ts",
  "./src/core/stable/stableGeneration.ts",
  "./src/core/horse/horseFactory.ts",
];

let updatedCount = 0;

filesToUpdate.forEach((filePath) => {
  const fullPath = path.join(__dirname, "..", filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping ${filePath} - file not found`);
    return;
  }

  let content = fs.readFileSync(fullPath, "utf8");
  const originalContent = content;

  // Replace @/game/uuid with @/core/uuid
  content = content.replace(/from ["']@\/game\/uuid["']/g, 'from "@/core/uuid"');

  // Replace @/core/common/uuid with @/core/uuid
  content = content.replace(/from ["']@\/core\/common\/uuid["']/g, 'from "@/core/uuid"');

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, "utf8");
    updatedCount++;
    console.log(`Updated: ${filePath}`);
  }
});

console.log(`\nUpdated ${updatedCount} files`);
