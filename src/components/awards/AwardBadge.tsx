import { Badge } from "@/components/ui/badge";
import { AwardIcon } from "./AwardIcon";
import { cn } from "@/lib/cn";
import { Link } from "@tanstack/react-router";
import type { AwardRegion, RegionalAwardCategory, RegionalAward } from "@/core/awards/types";
import { REGION_COLOR_CLASSES, getRegionColor } from "@/assets/awards";
import {
  CATEGORY_DISPLAY_NAMES,
  CATEGORY_DESCRIPTIONS,
  REGION_AWARD_NAMES,
} from "@/core/awards/types";
import { AWARD_BADGE_INLINE_MAX_WIDTH } from "@/constants/awardsConstants";

interface AwardBadgeProps {
  award: RegionalAward;
  showName?: boolean;
  showYear?: boolean;
  showRegion?: boolean;
  variant?: "inline" | "card" | "hero";
  className?: string;
  linkToCategory?: boolean;
}

export function AwardBadge({
  award,
  showName = true,
  showYear = true,
  showRegion = false,
  variant = "inline",
  className,
  linkToCategory,
}: AwardBadgeProps) {
  const categoryName = CATEGORY_DISPLAY_NAMES[award.category];
  const regionName = REGION_AWARD_NAMES[award.region];
  const description = CATEGORY_DESCRIPTIONS[award.category];
  const shouldLink = linkToCategory ?? (variant === "card" || variant === "hero");
  const linkParams = { params: { category: award.category } };

  if (variant === "inline") {
    const badge = (
      <Badge
        title={description}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1",
          REGION_COLOR_CLASSES[award.region],
          className,
        )}
      >
        <AwardIcon region={award.region} category={award.category} size="tiny" />
        <span
          className="text-xs font-medium truncate"
          style={{ maxWidth: AWARD_BADGE_INLINE_MAX_WIDTH }}
        >
          {categoryName}
        </span>
        {showYear && <span className="text-[10px] opacity-70">{award.year}</span>}
      </Badge>
    );
    if (shouldLink) {
      return (
        <Link to="/awards/$category" {...linkParams}>
          {badge}
        </Link>
      );
    }
    return badge;
  }

  if (variant === "card") {
    const card = (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border",
          "bg-card hover:bg-accent/50 transition-colors",
          className,
        )}
      >
        <AwardIcon
          region={award.region}
          category={award.category}
          size="small"
          animated={award.isHistoric}
        />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{categoryName}</div>
          <div className="text-xs text-muted-foreground line-clamp-1">{description}</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {showRegion && <span>{regionName}</span>}
            {showYear && <span>{award.year}</span>}
            <span className="text-gold font-semibold">{award.points} pts</span>
          </div>
        </div>
      </div>
    );
    if (shouldLink) {
      return (
        <Link to="/awards/$category" {...linkParams}>
          {card}
        </Link>
      );
    }
    return card;
  }

  // Hero variant
  const hero = (
    <div
      className={cn(
        "flex flex-col items-center text-center p-4 rounded-xl border",
        "bg-gradient-to-b from-card to-muted",
        className,
      )}
    >
      <AwardIcon region={award.region} category={award.category} size="large" animated />
      <h3 className="font-bold text-lg mt-2">{categoryName}</h3>
      <p className="text-sm text-muted-foreground">{regionName}</p>
      <div className="flex items-center gap-2 mt-1 text-sm">
        {showYear && (
          <span className="bg-t700 text-gold px-2 py-0.5 rounded-full">{award.year}</span>
        )}
        <span className="font-semibold text-gold">{award.points} points</span>
      </div>
    </div>
  );
  if (shouldLink) {
    return (
      <Link to="/awards/$category" {...linkParams}>
        {hero}
      </Link>
    );
  }
  return hero;
}

// Award badge with runner-up info
interface AwardBadgeWithRunnerUpProps extends AwardBadgeProps {
  runnerUpName?: string;
  runnerUpPoints?: number;
}

export function AwardBadgeWithRunnerUp({
  award,
  runnerUpName,
  runnerUpPoints,
  ...props
}: AwardBadgeWithRunnerUpProps) {
  return (
    <div className="space-y-2">
      <AwardBadge award={award} variant="card" {...props} />
      {runnerUpName && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground pl-12">
          <span>Runner-up: {runnerUpName}</span>
          {runnerUpPoints && <span>({runnerUpPoints} pts)</span>}
        </div>
      )}
    </div>
  );
}

// Compact award list item
interface AwardListItemProps {
  award: RegionalAward;
  showIcon?: boolean;
  onClick?: () => void;
  className?: string;
}

export function AwardListItem({ award, showIcon = true, onClick, className }: AwardListItemProps) {
  const categoryName = CATEGORY_DISPLAY_NAMES[award.category];
  const description = CATEGORY_DESCRIPTIONS[award.category];

  if (!onClick) {
    return (
      <Link
        to="/awards/$category"
        params={{ category: award.category }}
        title={description}
        className={cn(
          "w-full flex items-center gap-3 p-2 rounded-md text-left",
          "hover:bg-accent transition-colors cursor-pointer",
          className,
        )}
      >
        {showIcon && <AwardIcon region={award.region} category={award.category} size="tiny" />}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{categoryName}</div>
          <div className="text-xs text-muted-foreground">
            {award.year} • {award.points} pts
          </div>
        </div>
        {award.isHistoric && (
          <span className="text-xs bg-fame/20 text-fame px-1.5 py-0.5 rounded">Historic</span>
        )}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      title={description}
      className={cn(
        "w-full flex items-center gap-3 p-2 rounded-md text-left",
        "hover:bg-accent transition-colors",
        "cursor-pointer",
        className,
      )}
    >
      {showIcon && <AwardIcon region={award.region} category={award.category} size="tiny" />}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{categoryName}</div>
        <div className="text-xs text-muted-foreground">
          {award.year} • {award.points} pts
        </div>
      </div>
      {award.isHistoric && (
        <span className="text-xs bg-fame/20 text-fame px-1.5 py-0.5 rounded">Historic</span>
      )}
    </button>
  );
}
