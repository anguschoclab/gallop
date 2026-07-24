import { useMemo } from "react";
import { useGameWithShallow } from "@/game/store";
import type { ShareActivityFeedItem } from "@/core/breeding/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, TrendingDown, Crown, HandCoins, DollarSign } from "lucide-react";
import { formatCurrency } from "@/core/common/formatting";

interface ShareActivityFeedProps {
  syndicateId?: string;
}

function getStableName(id: string): string {
  if (id === "player") return "Your Stable";
  if (id === "treasury") return "Treasury";
  if (id === "market") return "Market";
  return id;
}

function FeedItemRow({ item }: { item: ShareActivityFeedItem }) {
  const icon = (() => {
    switch (item.type) {
      case "share_purchase":
        return <TrendingUp className="h-4 w-4 text-emerald-400" />;
      case "share_sale":
        return <TrendingDown className="h-4 w-4 text-amber-400" />;
      case "devolution":
        return <Crown className="h-4 w-4 text-gold" />;
      case "investor_solicit":
        return <HandCoins className="h-4 w-4 text-blue-400" />;
      case "investor_buyout":
        return <DollarSign className="h-4 w-4 text-purple-400" />;
      default:
        return null;
    }
  })();

  if (item.type === "devolution") {
    return (
      <div className="flex items-center gap-3 rounded-md border border-gold/20 bg-gold/5 px-3 py-2">
        {icon}
        <div className="flex-1 text-sm">
          <span className="text-cream">
            {item.stallionName ?? item.syndicateName} ownership transferred
          </span>
          <span className="text-cream-muted mx-2">·</span>
          <span className="text-cream-muted">
            {getStableName(item.previousOwner ?? "?")} → {getStableName(item.newOwner ?? "?")}
          </span>
        </div>
        <Badge variant="outline" className="text-gold border-gold/40 text-xs">
          Day {item.day}
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-cream/10 bg-broadcast-panel px-3 py-2">
      {icon}
      <div className="flex-1 text-sm">
        <span className="text-cream-muted">
          {getStableName(item.buyerStableId ?? "?")}
        </span>
        <ArrowRight className="h-3 w-3 inline mx-1 text-cream-muted" />
        <span className="text-cream-muted">
          {getStableName(item.sellerStableId ?? "?")}
        </span>
        <span className="text-cream mx-2">·</span>
        <span className="text-cream">{item.shares} shares</span>
        <span className="text-cream-muted mx-2">·</span>
        <span className="text-gold font-medium">{formatCurrency(item.cashMoved)}</span>
      </div>
      <Badge variant="outline" className="text-cream-muted border-cream/20 text-xs">
        Day {item.day}
      </Badge>
    </div>
  );
}

export function ShareActivityFeed({ syndicateId }: ShareActivityFeedProps) {
  const feed = useGameWithShallow((s: any) => s.shareActivityFeed ?? []) as ShareActivityFeedItem[];

  const filtered = useMemo(() => {
    const items = syndicateId
      ? feed.filter((f) => f.syndicateId === syndicateId)
      : feed;
    return [...items].reverse().slice(0, 50);
  }, [feed, syndicateId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-gold" /> Share Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-cream-muted text-sm py-4 text-center">
            No share activity yet.
          </div>
        ) : (
          filtered.map((item) => (
            <FeedItemRow key={item.id} item={item} />
          ))
        )}
      </CardContent>
    </Card>
  );
}
