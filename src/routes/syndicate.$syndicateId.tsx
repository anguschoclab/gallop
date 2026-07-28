import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useGame, useGameWithShallow, type StoreType } from "@/game/store";
import type { GameState } from "@/game/types";
import type { Syndicate } from "@/core/breeding/types";
import type { InvestorRecord } from "@/core/breeding/investorTypes";
import { INVESTOR_PERSONALITY_META } from "@/core/breeding/investorTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Users, DollarSign, TrendingUp, HandCoins } from "lucide-react";
import { ShareOwnershipPanel } from "@/components/market/ShareOwnershipPanel";
import { ShareActivityFeed } from "@/components/market/ShareActivityFeed";

export const Route = createFileRoute("/syndicate/$syndicateId")({
  component: SyndicatePage,
});

function SyndicatePage() {
  const { syndicateId } = Route.useParams();
  const navigate = useNavigate();
  const syndicate = useGame(
    (s: GameState) => (s.syndicates ?? {})[syndicateId] as Syndicate | undefined,
  );
  const investorsRecord = useGameWithShallow(
    (s: GameState) => s.syndicateInvestors ?? {},
  ) as Record<string, InvestorRecord>;
  const cash = useGame((s: GameState) => s.cash);
  const solicit = useGame((s: StoreType) => s.solicitInvestor);
  const buyout = useGame((s: StoreType) => s.buyoutInvestor);
  const horses = useGameWithShallow((s: GameState) => s.horses);
  const npcStables = useGameWithShallow((s: GameState) => s.npcStables ?? []);

  const [sharesToOffer, setSharesToOffer] = useState(1);

  const myInvestors = useMemo(
    () => Object.values(investorsRecord).filter((i) => i.syndicateId === syndicateId),
    [investorsRecord, syndicateId],
  );

  if (!syndicate) {
    return (
      <div className="p-6 text-cream">
        <Button variant="ghost" onClick={() => navigate({ to: "/breeding" })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="mt-4">Syndicate not found.</div>
      </div>
    );
  }

  const playerShares = syndicate.shareHolders["player"] ?? 0;
  const totalHeld = Object.values(syndicate.shareHolders).reduce((a, b) => a + b, 0);
  const investorShares = myInvestors.reduce((sum, i) => sum + i.shares, 0);
  const avgSat =
    myInvestors.length === 0
      ? null
      : Math.round(myInvestors.reduce((sum, i) => sum + i.satisfaction, 0) / myInvestors.length);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link to="/breeding" className="text-cream hover:text-gold">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-3xl font-bold text-cream">{syndicate.stallionName} Syndicate</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Your shares" value={`${playerShares}/${syndicate.totalShares}`} />
        <StatCard label="Share price" value={`$${syndicate.sharePrice.toLocaleString()}`} />
        <StatCard label="Stud fee" value={`$${syndicate.studFee.toLocaleString()}`} />
        <StatCard label="Investor sentiment" value={avgSat != null ? `${avgSat}%` : "—"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-gold" /> Solicit new investor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-cream-muted">
            Offer shares from your holdings. An NPC investor with a random personality will bite,
            paying the current share price. They arrive with expectations you'll have to meet.
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs text-cream-muted">Shares to offer</label>
              <Input
                type="number"
                min={1}
                max={Math.max(1, playerShares)}
                value={sharesToOffer}
                onChange={(e) => setSharesToOffer(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-28"
              />
            </div>
            <div className="text-cream">
              Sale price:{" "}
              <span className="text-gold font-semibold">
                ${(sharesToOffer * syndicate.sharePrice).toLocaleString()}
              </span>
            </div>
            <Button
              disabled={playerShares < sharesToOffer}
              onClick={() => {
                const r = solicit(syndicateId, sharesToOffer);
                if (!r?.ok) toast.error(r?.reason ?? "Solicitation failed");
                else toast.success("Investor secured");
              }}
            >
              Solicit
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gold" /> Investors ({myInvestors.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {myInvestors.length === 0 ? (
            <div className="text-cream-muted text-sm">No investors yet.</div>
          ) : (
            myInvestors.map((inv) => {
              const meta = INVESTOR_PERSONALITY_META[inv.personality];
              const buyoutCost = Math.round(
                syndicate.sharePrice * inv.shares * (0.8 + inv.satisfaction / 100),
              );
              return (
                <div
                  key={inv.id}
                  className="rounded-md border border-cream/10 bg-broadcast-panel p-3 space-y-2"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-cream font-medium">{inv.name}</div>
                    <Badge style={{ borderColor: meta.color, color: meta.color }} variant="outline">
                      {meta.label}
                    </Badge>
                    <Badge variant="outline" className="text-cream border-cream/30">
                      {inv.shares} shares
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        inv.satisfaction >= 60
                          ? "text-emerald-300 border-emerald-400/40"
                          : inv.satisfaction >= 40
                            ? "text-amber-300 border-amber-400/40"
                            : "text-red-300 border-red-400/40"
                      }
                    >
                      {inv.satisfaction}% sat
                    </Badge>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-xs text-cream-muted">
                        Buyout ${buyoutCost.toLocaleString()}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={cash < buyoutCost}
                        onClick={() => {
                          const r = buyout(inv.id);
                          if (!r?.ok) toast.error(r?.reason ?? "Buyout failed");
                          else toast.success(`Bought out ${inv.name}`);
                        }}
                      >
                        Buy out
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-cream-muted">{meta.blurb}</div>
                  <ul className="text-xs text-cream-muted space-y-0.5">
                    {inv.expectations.map((e, idx) => (
                      <li key={idx}>
                        • Expects{" "}
                        <span className="text-cream">
                          {e.kind === "asset_appreciation"
                            ? `share price ≥ $${e.target.toLocaleString()}`
                            : `${e.kind === "dividend" ? "dividends" : "prize share"} ≥ $${e.target.toLocaleString()}`}
                        </span>{" "}
                        within {e.horizonDays} days
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <ShareOwnershipPanel
        syndicate={syndicate}
        stallion={horses[syndicate.stallionId]}
        npcStables={npcStables}
      />

      <ShareActivityFeed syndicateId={syndicateId} />

      <div className="text-xs text-cream-muted flex items-center gap-4">
        <span className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" /> Lifetime stud earnings: $
          {syndicate.lifetimeEarnings.toLocaleString()}
        </span>
        <span className="flex items-center gap-1">
          <DollarSign className="h-3 w-3" /> Total shares held: {totalHeld}/{syndicate.totalShares}
        </span>
        <span>Investor shares: {investorShares}</span>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs text-cream-muted uppercase tracking-wide">{label}</div>
        <div className="text-2xl font-bold text-cream">{value}</div>
      </CardContent>
    </Card>
  );
}
