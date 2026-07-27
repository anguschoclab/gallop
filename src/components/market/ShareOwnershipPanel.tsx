import { useMemo } from "react";
import type { Syndicate } from "@/core/breeding/types";
import type { Horse, Stable } from "@/game/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, TrendingDown } from "lucide-react";
import { simulateShareChange } from "@/core/breeding/devolutionUtils";

interface ShareOwnershipPanelProps {
  syndicate: Syndicate;
  stallion?: Horse;
  npcStables?: Stable[];
}

function getHolderName(holderId: string, npcStables?: Stable[]): string {
  if (holderId === "player") return "Your Stable";
  const stable = npcStables?.find((s) => s.id === holderId);
  return stable?.name ?? holderId;
}

export function ShareOwnershipPanel({ syndicate, stallion, npcStables }: ShareOwnershipPanelProps) {
  const currentOwnerKey = stallion?.stableId ?? "player";
  const totalShares = syndicate.totalShares;
  const threshold = totalShares / 2;

  const holders = useMemo(() => {
    return Object.entries(syndicate.shareHolders)
      .map(([id, shares]) => ({
        id,
        name: getHolderName(id, npcStables),
        shares,
        percentage: (shares / totalShares) * 100,
        isOwner: id === currentOwnerKey,
      }))
      .sort((a, b) => b.shares - a.shares);
  }, [syndicate.shareHolders, totalShares, currentOwnerKey, npcStables]);

  const projections = useMemo(() => {
    return holders.map((h) => {
      const result = simulateShareChange(
        syndicate.shareHolders,
        totalShares,
        currentOwnerKey,
        h.id,
        -1,
      );
      return {
        holderId: h.id,
        holderName: h.name,
        wouldDevolve: result.wouldDevolve,
        newOwner: result.newOwner ? getHolderName(result.newOwner, npcStables) : null,
      };
    });
  }, [holders, syndicate.shareHolders, totalShares, currentOwnerKey, npcStables]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-gold" /> Share Ownership
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-cream-muted text-xs uppercase tracking-wide">
                <th className="text-left pb-2">Shareholder</th>
                <th className="text-right pb-2">Shares</th>
                <th className="text-right pb-2">%</th>
              </tr>
            </thead>
            <tbody>
              {holders.map((h) => (
                <tr key={h.id} className="border-t border-cream/10">
                  <td className="py-2 flex items-center gap-2">
                    {h.isOwner && <Crown className="h-3 w-3 text-gold" />}
                    <span className={h.isOwner ? "text-gold font-medium" : "text-cream"}>
                      {h.name}
                    </span>
                    {h.isOwner && (
                      <Badge variant="outline" className="text-gold border-gold/40 text-xs">
                        Owner
                      </Badge>
                    )}
                  </td>
                  <td className="text-right py-2 text-cream">{h.shares}</td>
                  <td className="text-right py-2 text-cream-muted">{h.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-cream-muted border-t border-cream/10 pt-3">
          Majority threshold: {Math.ceil(threshold)} shares ({(50).toFixed(0)}%)
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-cream flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-amber-400" />
            Projected Devolution (if 1 share sold)
          </div>
          <div className="space-y-1">
            {projections.map((p) => (
              <div
                key={p.holderId}
                className="flex items-center justify-between text-xs rounded-md border border-cream/10 bg-broadcast-panel px-3 py-2"
              >
                <span className="text-cream-muted">{p.holderName} sells 1 →</span>
                {p.wouldDevolve && p.newOwner ? (
                  <Badge variant="outline" className="text-amber-300 border-amber-400/40">
                    Ownership → {p.newOwner}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-cream-muted border-cream/20">
                    No change
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
