import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { GitCompare } from "lucide-react";
import { BookmarkButton } from "@/domains/bookmarks/ui/BookmarkButton";
import { CashPressureBadge } from "@/domains/stable/ui/CashPressureBadge";
import { RecommendedMaxOfferLine } from "@/domains/stable/ui/RecommendedMaxOfferLine";
import { TOOLTIP_DELAY_MS } from "@/shared/constants/uiConstants";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";
import { CashPressureTrend } from "@/domains/stable/ui/CashPressureTrend";
import { useCompareStables } from "@/domains/stable/application/hooks/useCompareStables";
import { useGame, useGameWithShallow } from "@/platform/game/store";
import {
  attachmentAdjustedAsk,
  calculateLotValuation,
  findPendingOfferForStable,
  getReputationStars,
  stableTierColor,
} from "@/domains/stable/application/stableCardService";
import type { Stable, PrivateSaleOffer } from "@/platform/game/types";
import { getStableOwnerName } from "@/domains/stable/application/stablePersonHelpers";

const BOOKMARK_TOP_OFFSET = "top-2";
const BOOKMARK_RIGHT_OFFSET = "right-2";
const COLOR_SWATCH_SIZE = "w-8 h-8";

const EMPTY_OFFERS: PrivateSaleOffer[] = [];

export function StableCard({ stable }: { stable: Stable }) {
  const privateSaleOffers = useGameWithShallow((s) => s.privateSaleOffers ?? EMPTY_OFFERS);
  const horses = useGame((s) => s.horses);
  const reputationScore = useGame((s) => s.reputation?.score ?? 0);
  const compare = useCompareStables();
  const isSelected = compare.has(stable.id);

  // Compute the pending offer + ask for this stable (gated — only when there's
  // a pending offer, which is rare). Object.values(horses) is expensive so it
  // stays inside this memo.
  const pendingOfferData = useMemo(() => {
    const pending = findPendingOfferForStable(privateSaleOffers, stable.id);
    if (!pending) return null;

    const horse = horses[pending.horseId];
    if (!horse) return { pending, ask: undefined as number | undefined };

    const allHorsesArray = Object.values(horses);
    const marketValue = calculateLotValuation(horse, stable, "racing_age", allHorsesArray);
    const ask = attachmentAdjustedAsk(horse, stable, marketValue, reputationScore);
    return { pending, ask };
  }, [privateSaleOffers, stable, horses, reputationScore]);

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    compare.toggle(stable.id);
  };

  return (
    <div className="relative h-full">
      <div className={`absolute ${BOOKMARK_TOP_OFFSET} right-10 z-10`}>
        <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCompareClick}
                aria-label="Compare"
              >
                <GitCompare
                  className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isSelected ? "Remove from comparison" : "Add to comparison"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className={`absolute ${BOOKMARK_TOP_OFFSET} ${BOOKMARK_RIGHT_OFFSET} z-10`}>
        <BookmarkButton
          type="stable"
          id={stable.id}
          label={stable.name}
          subtitle={`${stable.country} · ${stable.tier}`}
        />
      </div>
      <Link to="/npc-stables/$stableId" params={{ stableId: stable.id }}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-border">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`${COLOR_SWATCH_SIZE} rounded-full border-2`}
                  style={{
                    backgroundColor: stable.colors.primary,
                    borderColor: stable.colors.secondary,
                  }}
                />
                <div>
                  <CardTitle className="text-lg font-[family-name:var(--font-display)]">
                    {stable.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{stable.country}</p>
                </div>
              </div>
              <Badge className={stableTierColor(stable.tier)}>{stable.tier}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {stable.description ||
                `${getStableOwnerName(stable)}'s racing operation with ${stable.horses.length} horses.`}
            </p>
            <div className="mb-3">
              <CashPressureBadge stable={stable} />
            </div>
            <div className="mb-3">
              <RecommendedMaxOfferLine
                stable={stable}
                ask={pendingOfferData?.ask}
                offerAmount={pendingOfferData?.pending.amount}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{stable.horses.length} horses</span>
              <CashPressureTrend stableId={stable.id} variant="card" />
              <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-fame" tabIndex={0}>
                      {getReputationStars(stable.reputation)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Reputation: {stable.reputation}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
