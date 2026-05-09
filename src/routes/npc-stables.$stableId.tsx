// NPC Stable Detail - View stable info and horses with scouting
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Eye,
  Brain,
  Building2,
  Globe,
  Users,
  DollarSign,
  HandCoins,
} from "lucide-react";
import { useHorses, useDay, useCash } from "@/game/hooks/useCoreState";
import { useNpcStables, useAwards } from "@/game/hooks/useSystemsState";
import { useGame } from "@/game/store";
import { getStableById } from "@/core/stable/stableQueries";
import { PERSONALITY_CONFIG } from "@/core/stable/stableConfig";
import { calculateScoutCost } from "@/game/scouting";
import { getTierColor, getReputationStars } from "@/core/stable/uiHelpers";
import { HorseCard } from "@/components/HorseCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrophyCase } from "@/components/awards";
import { isMaleHorse } from "@/core/horse/gender";
import { isFemaleHorse } from "@/core/horse/gender";
import { NumericValue } from "@/components/HorseBits";
import { formatCurrency } from "@/lib/formatting";
import { useState } from "react";
import type { Horse, PrivateSaleOffer } from "@/game/types";
import { PrivateSaleOfferDialog } from "@/components/auction/PrivateSaleOfferDialog";
import { PrivateSaleCounterCard } from "@/components/auction/PrivateSaleCounterCard";
import { toast } from "sonner";

export const Route = createFileRoute("/npc-stables/$stableId")({ component: NpcStableDetailPage });

function NpcStableDetailPage() {
  const { stableId } = Route.useParams();
  const npcStables = useNpcStables();
  const horses = useHorses();
  const day = useDay();
  const cash = useCash();
  const awards = useAwards();
  const scoutHorse = useGame((s) => s.scoutHorse);
  const respondToPrivateSale = useGame((s) => s.respondToPrivateSale);
  const privateSaleOffers: PrivateSaleOffer[] = useGame((s) => s.privateSaleOffers ?? []);

  // Offer dialog state
  const [offerHorse, setOfferHorse] = useState<Horse | null>(null);

  const stable = getStableById(npcStables, stableId);
  if (!stable) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-cream">Stable Not Found</h1>
        <Link to="/npc-stables" className="text-gold hover:underline mt-4 inline-block">
          ← Back to Stables
        </Link>
      </div>
    );
  }

  const stableHorses = horses.filter((h: Horse) => h.stableId === stableId);
  const activeHorses = stableHorses.filter(
    (h: Horse) => !h.healthStatus || h.healthStatus === "healthy",
  );
  const colts = stableHorses.filter((h: Horse) => isMaleHorse(h.gender));
  const fillies = stableHorses.filter((h: Horse) => isFemaleHorse(h.gender));

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/npc-stables"
        className="text-gold hover:underline mb-4 inline-flex items-center gap-1"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Stables
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-full border-4 shadow-lg"
            style={{
              backgroundColor: stable.colors.primary,
              borderColor: stable.colors.secondary,
            }}
          />
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-cream font-[family-name:var(--font-display)]">
                {stable.name}
              </h1>
              <Badge className={getTierColor(stable.tier)}>{stable.tier.toUpperCase()}</Badge>
            </div>
            <p className="text-cream-muted mt-1">{stable.owner}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-cream-muted">
              <span className="flex items-center gap-1">
                <Globe className="w-4 h-4" />
                {stable.country}
              </span>
              <span className="flex items-center gap-1 font-[family-name:var(--font-mono)] tabular-nums">
                <Users className="w-4 h-4" />
                <NumericValue value={horses.length} /> horses
              </span>
              <span className="flex items-center gap-1 font-[family-name:var(--font-mono)] tabular-nums">
                <DollarSign className="w-4 h-4" />{formatCurrency(stable.cash)}
              </span>
              <span className="text-fame">{getReputationStars(stable.reputation)}</span>
            </div>
          </div>
        </div>

        {stable.description && (
          <p className="text-cream-muted bg-t700 p-4 rounded-lg">{stable.description}</p>
        )}

        {/* Personality */}
        <div className="mt-4 flex items-center gap-3">
          <Badge
            variant="outline"
            className="flex items-center gap-1 px-3 py-1 border-gold-muted text-cream"
          >
            <Brain className="w-3 h-3" />
            <span className="capitalize">{stable.personality.replace("-", " ")}</span>
          </Badge>
          <span className="text-sm text-cream-muted">
            {PERSONALITY_CONFIG[stable.personality]?.description}
          </span>
          {stable.preferredDistance && (
            <Badge className="text-xs bg-t700 text-cream">
              Specialist: {stable.preferredDistance}m {stable.preferredSurface}
            </Badge>
          )}
        </div>
      </div>

      {/* Awards */}
      <TrophyCase
        awards={awards?.filter((a) => a.stableId === stableId) ?? []}
        ownerName={stable.name}
        variant="compact"
        className="mb-6"
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-gold-muted">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold font-[family-name:var(--font-mono)] tabular-nums">
              <NumericValue value={stableHorses.length} />
            </div>
            <div className="text-sm text-cream-muted">Total Horses</div>
          </CardContent>
        </Card>
        <Card className="border-gold-muted">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold font-[family-name:var(--font-mono)] tabular-nums">
              <NumericValue value={activeHorses.length} />
            </div>
            <div className="text-sm text-cream-muted">Active Horses</div>
          </CardContent>
        </Card>
        <Card className="border-gold-muted">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold font-[family-name:var(--font-mono)] tabular-nums">
              <NumericValue value={colts.length} />
            </div>
            <div className="text-sm text-cream-muted">Colts/Horses</div>
          </CardContent>
        </Card>
        <Card className="border-gold-muted">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold font-[family-name:var(--font-mono)] tabular-nums">
              <NumericValue value={fillies.length} />
            </div>
            <div className="text-sm text-cream-muted">Fillies/Mares</div>
          </CardContent>
        </Card>
      </div>

      {/* Horses List */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 font-[family-name:var(--font-display)]">
          <Building2 className="w-5 h-5" />
          Horses
        </h2>

        <div className="space-y-3">
          {stableHorses.map((horse: Horse) => {
            const scoutCost = calculateScoutCost(horse, stable!);
            const canScout = !horse.lastScoutedDay || day - horse.lastScoutedDay > 0;

            // Find any active offer for this horse from the player
            const activeOffer = privateSaleOffers.find(
              (o: PrivateSaleOffer) =>
                o.horseId === horse.id &&
                o.fromStableId === undefined &&
                (o.status === "pending" || o.status === "countered"),
            );
            const hasInAuction = !!horse.consignedSaleId;

            const handleScout = () => {
              const result = scoutHorse(horse.id);
              if (result.success) {
                toast.success(result.message);
              } else {
                toast.error(result.message);
              }
            };

            return (
              <div key={horse.id} className="space-y-2">
                <div className="relative">
                  <HorseCard horse={horse} variant="scout" showScoutInfo />
                  <div className="absolute top-4 right-4 flex gap-2">
                    {/* D2 — Make an Offer button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOfferHorse(horse)}
                      disabled={!!activeOffer || hasInAuction}
                      title={
                        activeOffer
                          ? "Offer pending"
                          : hasInAuction
                            ? "This horse is currently in a sale."
                            : undefined
                      }
                      className="flex items-center gap-1"
                    >
                      <HandCoins className="w-4 h-4" />
                      {activeOffer ? "Offer pending" : "Make an Offer"}
                    </Button>
                    {canScout && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleScout}
                        disabled={cash < scoutCost}
                        className="flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Scout ${scoutCost.toLocaleString()}
                      </Button>
                    )}
                  </div>
                </div>

                {/* D2 — Counter offer card */}
                {activeOffer && (
                  <PrivateSaleCounterCard
                    offer={activeOffer}
                    horse={horse}
                    stable={stable!}
                    cash={cash}
                    onRespond={respondToPrivateSale}
                  />
                )}
              </div>
            );
          })}
        </div>

        {stableHorses.length === 0 && (
          <p className="text-cream-muted text-center py-8">No horses currently in this stable.</p>
        )}
      </div>

      {/* D2 — Make an Offer dialog */}
      {offerHorse && (
        <PrivateSaleOfferDialog
          horse={offerHorse}
          stable={stable!}
          isOpen={!!offerHorse}
          onClose={() => setOfferHorse(null)}
          cash={cash}
          allHorses={horses}
        />
      )}
    </div>
  );
}
