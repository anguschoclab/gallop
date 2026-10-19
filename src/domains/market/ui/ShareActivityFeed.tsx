import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useGameWithShallow, useGame } from "@/platform/game/store";
import type { GameState } from "@/platform/game/types";
import type { ShareActivityFeedItem } from "@/domains/breeding/application/breedingFacade";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { ArrowRight, TrendingUp, TrendingDown, Crown, HandCoins, DollarSign } from "lucide-react";
import { formatCurrency } from "@/shared/common/formatting";
import { SHARE_ACTIVITY_FEED_LIMIT } from "@/shared/constants/dashboardConstants";

interface ShareActivityFeedProps {
  syndicateId?: string;
}

function getStableName(id: string, npcStables: { id: string; name: string }[]): string {
  if (id === "player") return "Your Stable";
  if (id === "treasury") return "Treasury";
  if (id === "market") return "Market";
  const stable = npcStables.find((s) => s.id === id);
  return stable?.name ?? id;
}

function StableName({ id }: { id: string }) {
  const npcStables = useGame((s) => s.npcStables);
  const name = getStableName(id, npcStables);
  if (id === "player" || id === "treasury" || id === "market") {
    return <span className="text-muted-foreground">{name}</span>;
  }
  return (
    <Link
      to="/npc-stables/$stableId"
      params={{ stableId: id }}
      className="text-muted-foreground hover:text-primary hover:underline"
    >
      {name}
    </Link>
  );
}

function StallionName({ syndicateId, name }: { syndicateId: string; name: string }) {
  const syndicates = useGame((s) => s.syndicates);
  const stallionId = syndicates[syndicateId]?.stallionId;
  if (!stallionId) return <span className="text-foreground">{name}</span>;
  return (
    <Link
      to="/sire-watch/$stallionId"
      params={{ stallionId }}
      className="text-foreground hover:text-primary hover:underline"
    >
      {name}
    </Link>
  );
}

function FeedItemRow({ item }: { item: ShareActivityFeedItem }) {
  const icon = (() => {
    switch (item.type) {
      case "share_purchase":
        return <TrendingUp className="h-4 w-4 text-emerald-400" />;
      case "share_sale":
        return <TrendingDown className="h-4 w-4 text-amber-400" />;
      case "devolution":
        return <Crown className="h-4 w-4 text-primary" />;
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
      <div className="flex items-center gap-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
        {icon}
        <div className="flex-1 text-sm">
          <span className="text-foreground">
            <StallionName
              syndicateId={item.syndicateId}
              name={item.stallionName ?? item.syndicateName}
            />{" "}
            ownership transferred
          </span>
          <span className="text-muted-foreground mx-2">·</span>
          <span className="text-muted-foreground">
            <StableName id={item.previousOwner ?? "?"} /> → <StableName id={item.newOwner ?? "?"} />
          </span>
        </div>
        <Badge variant="outline" className="text-primary border-primary/40 text-xs">
          Day {item.day}
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-foreground/10 bg-broadcast-panel px-3 py-2">
      {icon}
      <div className="flex-1 text-sm">
        <span className="text-muted-foreground">
          <StableName id={item.buyerStableId ?? "?"} />
        </span>
        <ArrowRight className="h-3 w-3 inline mx-1 text-muted-foreground" />
        <span className="text-muted-foreground">
          <StableName id={item.sellerStableId ?? "?"} />
        </span>
        <span className="text-foreground mx-2">·</span>
        <span className="text-foreground">{item.shares} shares</span>
        <span className="text-muted-foreground mx-2">·</span>
        <span className="text-primary font-medium">{formatCurrency(item.cashMoved)}</span>
      </div>
      <Badge variant="outline" className="text-muted-foreground border-foreground/20 text-xs">
        Day {item.day}
      </Badge>
    </div>
  );
}

export function ShareActivityFeed({ syndicateId }: ShareActivityFeedProps) {
  const feed = useGameWithShallow(
    (s: GameState) => s.shareActivityFeed ?? [],
  ) as ShareActivityFeedItem[];

  const filtered = useMemo(() => {
    const items = syndicateId ? feed.filter((f) => f.syndicateId === syndicateId) : feed;
    return [...items].reverse().slice(0, SHARE_ACTIVITY_FEED_LIMIT);
  }, [feed, syndicateId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" /> Share Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-muted-foreground text-sm py-4 text-center">
            No share activity yet.
          </div>
        ) : (
          filtered.map((item) => <FeedItemRow key={item.id} item={item} />)
        )}
      </CardContent>
    </Card>
  );
}
