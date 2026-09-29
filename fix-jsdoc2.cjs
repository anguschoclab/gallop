const fs = require("fs");

// src/core/race/raceSuitabilityScorers.ts
let content = fs.readFileSync("src/core/race/raceSuitabilityScorers.ts", "utf8");
content = content.replace(
  "/** Score how well the race grade matches the horse's current prestige tier. */\nexport function scoreGradeSuitability(",
  "/**\n * Score how well the race grade matches the horse's current prestige tier.\n * @param root0 - The parameter object.\n * @param root0.horse - The horse.\n * @param root0.race - The race.\n * @returns The score.\n */\nexport function scoreGradeSuitability(",
);
fs.writeFileSync("src/core/race/raceSuitabilityScorers.ts", content);

// src/core/time/phases/schedulerPhase.ts
content = fs.readFileSync("src/core/time/phases/schedulerPhase.ts", "utf8");
content = content.replace(
  "/**\n * Auto-enrolls horses with the `autoManaged` flag in suitable races.\n */\nexport function executeSchedulerPhase(",
  "/**\n * Auto-enrolls horses with the `autoManaged` flag in suitable races.\n * @param context - The execution context for the phase.\n * @returns A promise resolving when the phase completes.\n */\nexport function executeSchedulerPhase(",
);
fs.writeFileSync("src/core/time/phases/schedulerPhase.ts", content);

// src/services/market/auctionHouseService.ts
content = fs.readFileSync("src/services/market/auctionHouseService.ts", "utf8");
content = content.replace(
  "/** Helper to filter lots belonging to a specific sale */\nexport function getLotsForSale(",
  "/**\n * Helper to filter lots belonging to a specific sale\n * @param state - The game state containing auctions and lots\n * @param saleId - The ID of the specific sale to filter by\n * @returns An array of auction lots for the given sale\n */\nexport function getLotsForSale(",
);
fs.writeFileSync("src/services/market/auctionHouseService.ts", content);

// Let's do src/data/importedRealWorld.ts with regex
content = fs.readFileSync("src/data/importedRealWorld.ts", "utf8");
content = content.replace(
  "export const getTopStallions = (count = 10, offset = 0) => {",
  "/**\n * Gets top stallions.\n * @param count - the count.\n * @param offset - the offset.\n * @returns the top stallions.\n */\nexport const getTopStallions = (count = 10, offset = 0) => {",
);
content = content.replace(
  "export const getTopMares = (count = 10, offset = 0) => {",
  "/**\n * Gets top mares.\n * @param count - the count.\n * @param offset - the offset.\n * @returns the top mares.\n */\nexport const getTopMares = (count = 10, offset = 0) => {",
);
content = content.replace(
  "export const getRandomUnusedCareer = (rng: RandomGenerator) => {",
  "/**\n * Gets random unused career.\n * @param rng - the random generator.\n * @returns the unused career.\n */\nexport const getRandomUnusedCareer = (rng: RandomGenerator) => {",
);
content = content.replace(
  "export const parseStallionsCSV = (text: string) => {",
  "/**\n * Parses stallions CSV.\n * @param text - the text.\n * @returns the parsed data.\n */\nexport const parseStallionsCSV = (text: string) => {",
);
content = content.replace(
  "export const parseMaresCSV = (text: string) => {",
  "/**\n * Parses mares CSV.\n * @param text - the text.\n * @returns the parsed data.\n */\nexport const parseMaresCSV = (text: string) => {",
);
content = content.replace(
  "export const importStallionData = (value: string) => {",
  "/**\n * Imports stallion data.\n * @param value - the value.\n * @returns the imported data.\n */\nexport const importStallionData = (value: string) => {",
);
content = content.replace(
  "export const importMareData = (value: string) => {",
  "/**\n * Imports mare data.\n * @param value - the value.\n * @returns the imported data.\n */\nexport const importMareData = (value: string) => {",
);
content = content.replace(
  "export const generateFullImportTree = () => {",
  "/**\n * Generates full import tree.\n * @returns the full tree.\n */\nexport const generateFullImportTree = () => {",
);
fs.writeFileSync("src/data/importedRealWorld.ts", content);
