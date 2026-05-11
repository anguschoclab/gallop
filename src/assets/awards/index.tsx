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
  Icon: React.ComponentType<{ width: number; height: number; className?: string }>;
  color: string;
  accent: string;
}

// Map of all award SVGs by region and category type
const AWARD_SVGS: Record<AwardRegion, { hoty: AwardSvgData; category: AwardSvgData }> = {
  north_america: {
    hoty: { Icon: naHoty.HotyIcon, color: naHoty.hotyColor, accent: naHoty.hotyAccent },
    category: {
      Icon: naCategory.CategoryIcon,
      color: naCategory.categoryColor,
      accent: naCategory.categoryAccent,
    },
  },
  europe: {
    hoty: { Icon: euHoty.HotyIcon, color: euHoty.hotyColor, accent: euHoty.hotyAccent },
    category: {
      Icon: euCategory.CategoryIcon,
      color: euCategory.categoryColor,
      accent: euCategory.categoryAccent,
    },
  },
  asia_pacific: {
    hoty: { Icon: apacHoty.HotyIcon, color: apacHoty.hotyColor, accent: apacHoty.hotyAccent },
    category: {
      Icon: apacCategory.CategoryIcon,
      color: apacCategory.categoryColor,
      accent: apacCategory.categoryAccent,
    },
  },
  south_america: {
    hoty: { Icon: saHoty.HotyIcon, color: saHoty.hotyColor, accent: saHoty.hotyAccent },
    category: {
      Icon: saCategory.CategoryIcon,
      color: saCategory.categoryColor,
      accent: saCategory.categoryAccent,
    },
  },
};

// Determine if category is HOTY
function isHoty(category: RegionalAwardCategory): boolean {
  return category === "horse_of_the_year";
}

/**
 * Get SVG data for a specific award.
 *
 * @param region - Awarding region
 * @param category - Award category
 * @returns SVG path and color metadata
 */
export function getAwardSvg(region: AwardRegion, category: RegionalAwardCategory): AwardSvgData {
  const type = isHoty(category) ? "hoty" : "category";
  return AWARD_SVGS[region][type];
}

/**
 * Get color for region (for fallback/icons).
 *
 * @param region - Target region
 * @returns Primary color hex/variable
 */
export function getRegionColor(region: AwardRegion): string {
  return AWARD_SVGS[region].hoty.color;
}

/**
 * Get accent color for region.
 *
 * @param region - Target region
 * @returns Accent color hex/variable
 */
export function getRegionAccent(region: AwardRegion): string {
  return AWARD_SVGS[region].hoty.accent;
}

// All region colors for UI use
export const REGION_COLORS: Record<AwardRegion, { bg: string; accent: string }> = {
  north_america: { bg: "var(--color-region-na-bg)", accent: "var(--color-region-na-accent)" },
  europe: { bg: "var(--color-region-eu-bg)", accent: "var(--color-region-eu-accent)" },
  asia_pacific: { bg: "var(--color-region-apac-bg)", accent: "var(--color-region-apac-accent)" },
  south_america: { bg: "var(--color-region-sa-bg)", accent: "var(--color-region-sa-accent)" },
};

// Tailwind-compatible region color classes
export const REGION_COLOR_CLASSES: Record<AwardRegion, string> = {
  north_america: "bg-region-na-bg/10 border-region-na-bg/30 text-region-na-bg",
  europe: "bg-region-eu-bg/10 border-region-eu-bg/30 text-region-eu-bg",
  asia_pacific: "bg-region-apac-bg/10 border-region-apac-bg/30 text-region-apac-bg",
  south_america: "bg-region-sa-bg/10 border-region-sa-bg/30 text-region-sa-bg",
};
