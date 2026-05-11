import { getAwardSvg } from "@/assets/awards";
import type { AwardRegion, RegionalAwardCategory } from "@/game/awards/types";
import { CATEGORY_DISPLAY_NAMES, REGION_AWARD_NAMES } from "@/game/awards/types";
import { cn } from "@/lib/utils";

interface AwardIconProps {
  region: AwardRegion;
  category: RegionalAwardCategory;
  size?: "tiny" | "small" | "medium" | "large" | "xl";
  year?: number;
  animated?: boolean;
  className?: string;
  showTooltip?: boolean;
}

const SIZE_CONFIG = {
  tiny: { width: 24, height: 24, className: "w-6 h-6" },
  small: { width: 32, height: 32, className: "w-8 h-8" },
  medium: { width: 48, height: 48, className: "w-12 h-12" },
  large: { width: 64, height: 64, className: "w-16 h-16" },
  xl: { width: 128, height: 128, className: "w-32 h-32" },
};

export function AwardIcon({
  region,
  category,
  size = "medium",
  year,
  animated = false,
  className,
  showTooltip = false,
}: AwardIconProps) {
  const { Icon, color } = getAwardSvg(region, category);
  const config = SIZE_CONFIG[size];

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center",
        "award-icon",
        animated && "award-icon-animated",
        config.className,
        className,
      )}
      style={{ color }}
      title={showTooltip ? getTooltipText(region, category, year) : undefined}
    >
      <Icon
        width={config.width}
        height={config.height}
      />
    </div>
  );
}

// Award SVG display with year badge
interface AwardIconWithYearProps extends AwardIconProps {
  year: number;
}

export function AwardIconWithYear({ year, ...props }: AwardIconWithYearProps) {
  return (
    <div className="relative inline-flex">
      <AwardIcon {...props} />
      <span className="absolute -bottom-1 -right-1 bg-t700 text-cream text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
        {year}
      </span>
    </div>
  );
}

// Fallback icon when SVG is not available
interface AwardFallbackProps {
  region: AwardRegion;
  category: RegionalAwardCategory;
  size?: "tiny" | "small" | "medium" | "large" | "xl";
  className?: string;
}

export function AwardFallback({
  region,
  category,
  size = "medium",
  className,
}: AwardFallbackProps) {
  const config = SIZE_CONFIG[size];
  const { color, accent } = getAwardSvg(region, category);

  // Get first letters of category for display
  const initials = getCategoryInitials(category);

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full font-bold",
        config.className,
        className,
      )}
      style={{ backgroundColor: color, color: accent }}
    >
      <span className="text-xs">{initials}</span>
    </div>
  );
}

// Helper functions
function getTooltipText(
  region: AwardRegion,
  category: RegionalAwardCategory,
  year?: number,
): string {
  const categoryName = CATEGORY_DISPLAY_NAMES[category] || category;
  const regionName = REGION_AWARD_NAMES[region];
  return year ? `${categoryName} (${year}) - ${regionName}` : `${categoryName} - ${regionName}`;
}

function getCategoryInitials(category: RegionalAwardCategory): string {
  if (category === "horse_of_the_year") return "HOTY";

  // Get first letter of each word
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 3)
    .join("");
}
