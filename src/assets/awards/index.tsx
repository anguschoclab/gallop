// Award SVG Assets Index
// Central export for all regional award icons

import type { AwardRegion, RegionalAwardCategory } from "@/core/awards/types";
import { REGION_AWARD_CONFIG, type SvgProps } from "./shared";

// North America
import { HotyIcon as NaHotyIcon } from "./north-america/hoty";
import { CategoryIcon as NaCategoryIcon } from "./north-america/category";

// Europe
import { HotyIcon as EuHotyIcon } from "./europe/hoty";
import { CategoryIcon as EuCategoryIcon } from "./europe/category";

// Asia-Pacific
import { HotyIcon as ApacHotyIcon } from "./asia-pacific/hoty";
import { CategoryIcon as ApacCategoryIcon } from "./asia-pacific/category";

// South America
import { HotyIcon as SaHotyIcon } from "./south-america/hoty";
import { CategoryIcon as SaCategoryIcon } from "./south-america/category";

import type React from "react";

export interface AwardSvgData {
  Icon: React.ComponentType<SvgProps>;
  color: string;
  accent: string;
}

// Map of all award SVGs by region and category type
const AWARD_SVGS: Record<AwardRegion, { hoty: AwardSvgData; category: AwardSvgData }> = {
  north_america: {
    hoty: {
      Icon: NaHotyIcon,
      color: REGION_AWARD_CONFIG.north_america.hoty.primary,
      accent: REGION_AWARD_CONFIG.north_america.hoty.accent,
    },
    category: {
      Icon: NaCategoryIcon,
      color: REGION_AWARD_CONFIG.north_america.category.primary,
      accent: REGION_AWARD_CONFIG.north_america.category.accent,
    },
  },
  europe: {
    hoty: {
      Icon: EuHotyIcon,
      color: REGION_AWARD_CONFIG.europe.hoty.primary,
      accent: REGION_AWARD_CONFIG.europe.hoty.accent,
    },
    category: {
      Icon: EuCategoryIcon,
      color: REGION_AWARD_CONFIG.europe.category.primary,
      accent: REGION_AWARD_CONFIG.europe.category.accent,
    },
  },
  asia_pacific: {
    hoty: {
      Icon: ApacHotyIcon,
      color: REGION_AWARD_CONFIG.asia_pacific.hoty.primary,
      accent: REGION_AWARD_CONFIG.asia_pacific.hoty.accent,
    },
    category: {
      Icon: ApacCategoryIcon,
      color: REGION_AWARD_CONFIG.asia_pacific.category.primary,
      accent: REGION_AWARD_CONFIG.asia_pacific.category.accent,
    },
  },
  south_america: {
    hoty: {
      Icon: SaHotyIcon,
      color: REGION_AWARD_CONFIG.south_america.hoty.primary,
      accent: REGION_AWARD_CONFIG.south_america.hoty.accent,
    },
    category: {
      Icon: SaCategoryIcon,
      color: REGION_AWARD_CONFIG.south_america.category.primary,
      accent: REGION_AWARD_CONFIG.south_america.category.accent,
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
