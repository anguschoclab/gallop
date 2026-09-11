/**
 * newsGenerator.ts - Re-export from @/core/narrative/newsGenerator
 *
 * The canonical implementation now lives in core. This re-export keeps
 * existing service importers working during the transition.
 *
 * @deprecated Import from @/core/narrative/newsGenerator instead.
 */

export {
  createNewsItem,
  generateRaceNews,
  generateMarketNews,
  generateFlavorNews,
  generateWeeklyFlavorNews,
} from "@/core/narrative/newsGenerator";
export { generateG1SpotlightNews, generateFollowUpRaceNews } from "@/core/narrative/newsSpotlight";
