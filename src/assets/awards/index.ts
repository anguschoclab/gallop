// Award SVG Assets Index
// Central export for all regional award icons

import type { AwardRegion, RegionalAwardCategory } from "@/game/awards/types";

// North America
import * as naHoty from "./north-america/hoty";
import * as naCategory from "./north-america/category";

// Europe
import * as euHoty from "./europe/hoty";
import * as euCategory from "./europe/category";

// Asia-Pacific
import * as apacHoty from "./asia-pacific/hoty";
import * as apacCategory from "./asia-pacific/category";

// South America
import * as saHoty from "./south-america/hoty";
import * as saCategory from "./south-america/category";

export interface AwardSvgData {
  svg: string;
  color: string;
  accent: string;
}

// Map of all award SVGs by region and category type
const AWARD_SVGS: Record<AwardRegion, { hoty: AwardSvgData; category: AwardSvgData }> = {
  north_america: {
    hoty: { svg: naHoty.hotySvg, color: naHoty.hotyColor, accent: naHoty.hotyAccent },
    category: { svg: naCategory.categorySvg, color: naCategory.categoryColor, accent: naCategory.categoryAccent },
  },
  europe: {
    hoty: { svg: euHoty.hotySvg, color: euHoty.hotyColor, accent: euHoty.hotyAccent },
    category: { svg: euCategory.categorySvg, color: euCategory.categoryColor, accent: euCategory.categoryAccent },
  },
  asia_pacific: {
    hoty: { svg: apacHoty.hotySvg, color: apacHoty.hotyColor, accent: apacHoty.hotyAccent },
    category: { svg: apacCategory.categorySvg, color: apacCategory.categoryColor, accent: apacCategory.categoryAccent },
  },
  south_america: {
    hoty: { svg: saHoty.hotySvg, color: saHoty.hotyColor, accent: saHoty.hotyAccent },
    category: { svg: saCategory.categorySvg, color: saCategory.categoryColor, accent: saCategory.categoryAccent },
  },
};

// Determine if category is HOTY
function isHoty(category: RegionalAwardCategory): boolean {
  return category === "horse_of_the_year";
}

// Get SVG data for a specific award
export function getAwardSvg(region: AwardRegion, category: RegionalAwardCategory): AwardSvgData {
  const type = isHoty(category) ? "hoty" : "category";
  return AWARD_SVGS[region][type];
}

// Get color for region (for fallback/icons)
export function getRegionColor(region: AwardRegion): string {
  return AWARD_SVGS[region].hoty.color;
}

export function getRegionAccent(region: AwardRegion): string {
  return AWARD_SVGS[region].hoty.accent;
}

// All region colors for UI use
export const REGION_COLORS: Record<AwardRegion, { bg: string; accent: string }> = {
  north_america: { bg: "#1E3A5F", accent: "#C9A227" },
  europe: { bg: "#4B0082", accent: "#C0C0C0" },
  asia_pacific: { bg: "#006400", accent: "#FFD700" },
  south_america: { bg: "#8B0000", accent: "#FFD700" },
};

// Tailwind-compatible region color classes
export const REGION_COLOR_CLASSES: Record<AwardRegion, string> = {
  north_america: "bg-blue-500/10 border-blue-500/30 text-blue-700",
  europe: "bg-purple-500/10 border-purple-500/30 text-purple-700",
  asia_pacific: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700",
  south_america: "bg-red-500/10 border-red-500/30 text-red-700",
};
