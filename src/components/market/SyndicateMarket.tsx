import { useMemo } from "react";
import { useGame, useGameWithShallow, type StoreType } from "@/game/store";
import type { Syndicate } from "@/core/breeding/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/core/common/formatting";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function SyndicateMarket() {
  const syndicates = useGameWithShallow((s: StoreType) => s.syndicates || {});
  const horses = useGameWithShallow((s: StoreType) => s.horses);
  const purchaseShares = useGame((s: StoreType) => s.purchaseShares);
  const sellShares = useGame((s: StoreType) => s.sellShares);
  const cash = useGame((s: StoreType) => s.cash);

  // ⚡ Bolt Optimization:
  // Used O(1) horseMap lookup instead of O(N) horses.find() inside the map loop.
  // Impact: Reduces rendering complexity of the syndicate list from O(N^2) to O(N).
  const syndicateList = useMemo(() => {
    return Object.entries(syndicates).map(([stallionId, syndicate]: [string, Syndicate]) => {
      const stallion = horses[stallionId];
      return {
        syndicate,
        stallion,
        playerShares: syndicate.shareHolders["player"] || 0,
        ownershipPercent: ((syndicate.shareHolders["player"] || 0) / syndicate.totalShares) * 100,
      };
    });
  }, [syndicates, horses]);

  const handlePurchase = (syndicateId: string, sharePrice: number) => {
    const shares = 1;
    const result = purchaseShares(syndicateId, shares, sharePrice);
    if (result.ok) {
      toast.success("Share purchased!");
    } else {
      toast.error(result.reason);
    }
  };

  const handleSale = (syndicateId: string, sharePrice: number) => {
    const shares = 1;
    const result = sellShares(syndicateId, shares, sharePrice);
    if (result.ok) {
      toast.success("Share sold!");
    } else {
      toast.error(result.reason);
    }
  };

  if (syndicateList.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg font-medium">No syndicates available</p>
        <p className="text-sm mt-2">Syndicates are created for G1-winning stallions.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {syndicateList.map(({ syndicate, stallion, playerShares, ownershipPercent }) => (
        <Card key={syndicate.id} className="bg-card border-white/10">
          <CardHeader>
            <CardTitle className="text-lg font-black uppercase italic text-primary">
              {syndicate.stallionName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Shares</span>
                <span className="font-medium">{syndicate.totalShares}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Share Price</span>
                <span className="font-medium">{formatCurrency(syndicate.sharePrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stud Fee</span>
                <span className="font-medium">{formatCurrency(syndicate.studFee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lifetime Earnings</span>
                <span className="font-medium">{formatCurrency(syndicate.lifetimeEarnings)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={playerShares > 0 ? "default" : "secondary"}>
                {playerShares > 0 ? `You own ${playerShares} shares` : "Not owned"}
              </Badge>
              {playerShares > 0 && <Badge variant="outline">{ownershipPercent.toFixed(0)}%</Badge>}
            </div>

            <div className="flex gap-2">
              {cash < syndicate.sharePrice ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0} className="flex-1 flex cursor-not-allowed">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full pointer-events-none"
                        disabled
                      >
                        Buy 1 Share
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Not enough cash</TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handlePurchase(syndicate.id, syndicate.sharePrice)}
                >
                  Buy 1 Share
                </Button>
              )}
              {playerShares > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleSale(syndicate.id, syndicate.sharePrice)}
                >
                  Sell 1 Share
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
