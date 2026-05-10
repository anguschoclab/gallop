// NPC Stable Detail - View stable info and horses with scouting
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  Eye,
  Brain,
  Building2,
  Globe,
  Users,
  DollarSign,
  HandCoins,
  Trophy,
  CalendarDays,
  Calendar,
  ListChecks,
  History,
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
import { isMaleHorse, isFemaleHorse } from "@/core/horse/gender";
import { NumericValue } from "@/components/HorseBits";
import { formatCurrency } from "@/lib/formatting";
import { useState } from "react";
import type { Horse, PrivateSaleOffer } from "@/game/types";
import { PrivateSaleOfferDialog } from "@/components/auction/PrivateSaleOfferDialog";
import { PrivateSaleCounterCard } from "@/components/auction/PrivateSaleCounterCard";
import { toast } from "sonner";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  tab: fallback(z.enum(["overview", "roster", "staff", "history"]), "overview").default("overview"),
});

export const Route = createFileRoute("/npc-stables/$stableId")({
  component: NpcStableDetailPage,
  validateSearch: zodValidator(searchSchema),
});

function NpcStableDetailPage() {
  const { stableId } = Route.useParams();
  const router = useRouter();
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

  const tab = Route.useSearch({ select: (s) => s.tab });
  const navigate = Route.useNavigate();

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={() => {
          if (window.history.length > 2) {
            router.history.back();
          } else {
            router.navigate({ to: "/npc-stables" });
          }
        }}
        className="text-gold hover:underline inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Stables
      </button>

      {/* Header */}
      <div>
        <div className="flex items-start gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-full border-4 shadow-lg shrink-0"
            style={{
              backgroundColor: stable.colors.primary,
              borderColor: stable.colors.secondary,
            }}
          />
          <div className="flex-1">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-cream font-[family-name:var(--font-display)]">
                  {stable.name}
                </h1>
                <Badge className={getTierColor(stable.tier)}>{stable.tier.toUpperCase()}</Badge>
              </div>
              <Link to="/races" search={{ stableId }}>
                <Button variant="outline" size="sm" className="gap-2 border-gold text-gold hover:bg-gold hover:text-t950">
                  <Calendar className="w-4 h-4" />
                  Upcoming Races
                </Button>
              </Link>
            </div>
            <p className="text-cream-muted mt-1">{stable.owner}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-cream-muted flex-wrap">
              <span className="flex items-center gap-1">
                <Globe className="w-4 h-4" />
                {stable.country}
              </span>
              <span className="flex items-center gap-1 font-mono tabular-nums">
                <Users className="w-4 h-4" />
                <NumericValue value={stableHorses.length} /> horses
              </span>
              <span className="flex items-center gap-1 font-mono tabular-nums">
                <DollarSign className="w-4 h-4" />
                {formatCurrency(stable.cash)}
              </span>
              <span className="text-fame">{getReputationStars(stable.reputation)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Body: main + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-6 min-w-0">
          {/* Tab nav */}
          <div className="flex flex-wrap gap-2 border-b border-gold-muted pb-2">
            {(
              [
                { key: "overview", label: "Overview", icon: Building2 },
                { key: "roster", label: "Roster", icon: ListChecks },
                { key: "staff", label: "Staff", icon: Users },
                { key: "history", label: "History", icon: History },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => navigate({ search: { tab: key } })}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors",
                  tab === key
                    ? "bg-gold text-t950"
                    : "text-cream-muted hover:text-cream hover:bg-t700",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div className="space-y-4">
              {stable.description && (
                <p className="text-cream-muted bg-t700 p-4 rounded-lg">{stable.description}</p>
              )}
              <div className="flex items-center gap-3 flex-wrap">
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

              <TrophyCase
                awards={awards?.filter((a) => a.stableId === stableId) ?? []}
                ownerName={stable.name}
                variant="compact"
              />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatTile label="Total Horses" value={stableHorses.length} />
                <StatTile label="Active" value={activeHorses.length} />
                <StatTile label="Colts/Horses" value={colts.length} />
                <StatTile label="Fillies/Mares" value={fillies.length} />
              </div>
            </div>
          )}

          {tab === "roster" && (
            <div className="space-y-3">
              {stableHorses.map((horse: Horse) => {
                const scoutCost = calculateScoutCost(horse, stable!);
                const canScout = !horse.lastScoutedDay || day - horse.lastScoutedDay > 0;

                const activeOffer = privateSaleOffers.find(
                  (o: PrivateSaleOffer) =>
                    o.horseId === horse.id &&
                    o.fromStableId === undefined &&
                    (o.status === "pending" || o.status === "countered"),
                );
                const hasInAuction = !!horse.consignedSaleId;

                const handleScout = () => {
                  const result = scoutHorse(horse.id);
                  if (result.success) toast.success(result.message);
                  else toast.error(result.message);
                };

                return (
                  <div key={horse.id} className="space-y-2">
                    <div className="relative">
                      <HorseCard horse={horse} variant="scout" showScoutInfo />
                      <div className="absolute top-4 right-4 flex gap-2">
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
              {stableHorses.length === 0 && (
                <p className="text-cream-muted text-center py-8">
                  No horses currently in this stable.
                </p>
              )}
            </div>
          )}

          {tab === "staff" && (
            <Card className="border-gold-muted">
              <CardHeader>
                <CardTitle className="text-lg">Staff Roster</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(stable.staff || {}).map(([role, name]) => (
                    <div
                      key={role}
                      className="flex items-center justify-between p-3 bg-t700 rounded-md"
                    >
                      <span className="text-sm text-cream-muted capitalize">
                        {role.replace(/_/g, " ")}
                      </span>
                      <span className="text-sm font-medium text-cream">
                        {name || <span className="italic text-cream-muted">Vacant</span>}
                      </span>
                    </div>
                  ))}
                  {Object.keys(stable.staff || {}).length === 0 && (
                    <p className="text-cream-muted italic text-sm">No staff information available.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {tab === "history" && (
            <Card className="border-gold-muted">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5" /> Stable History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-cream-muted">Founded</span>
                  <span className="font-mono tabular-nums">{stable.founded}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cream-muted">Reputation</span>
                  <span className="font-mono tabular-nums">{stable.reputation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cream-muted">Cash on hand</span>
                  <span className="font-mono tabular-nums">{formatCurrency(stable.cash)}</span>
                </div>
                <TrophyCase
                  awards={awards?.filter((a) => a.stableId === stableId) ?? []}
                  ownerName={stable.name}
                  variant="compact"
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="border-gold-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wide text-cream-muted">
                Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <SidebarRow label="Tier">
                <Badge className={getTierColor(stable.tier)}>{stable.tier}</Badge>
              </SidebarRow>
              <SidebarRow label="Country">{stable.country ?? "—"}</SidebarRow>
              <SidebarRow label="Founded">{stable.founded}</SidebarRow>
              <SidebarRow label="Reputation">{getReputationStars(stable.reputation)}</SidebarRow>
              <SidebarRow label="Horses">{stableHorses.length}</SidebarRow>
              <SidebarRow label="Cash">{formatCurrency(stable.cash)}</SidebarRow>
            </CardContent>
          </Card>

          <Card className="border-gold-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wide text-cream-muted">
                Quick Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <SidebarLink onClick={() => navigate({ search: { tab: "roster" } })} icon={ListChecks}>
                Horses ({stableHorses.length})
              </SidebarLink>
              <SidebarLink onClick={() => navigate({ search: { tab: "staff" } })} icon={Users}>
                Staff
              </SidebarLink>
              <SidebarLink onClick={() => navigate({ search: { tab: "history" } })} icon={History}>
                History
              </SidebarLink>
              <Link
                to="/races"
                search={{ stableId }}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm text-cream-muted hover:text-gold hover:bg-t700 transition-colors"
              >
                <CalendarDays className="w-4 h-4" /> Upcoming Races
              </Link>
              <Link
                to="/hall-of-fame"
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm text-cream-muted hover:text-gold hover:bg-t700 transition-colors"
              >
                <Trophy className="w-4 h-4" /> Hall of Fame
              </Link>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Make an Offer dialog */}
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

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-gold-muted">
      <CardContent className="pt-4">
        <div className="text-2xl font-bold font-mono tabular-nums">
          <NumericValue value={value} />
        </div>
        <div className="text-sm text-cream-muted">{label}</div>
      </CardContent>
    </Card>
  );
}

function SidebarRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-cream-muted">{label}</span>
      <span className="font-mono tabular-nums text-cream">{children}</span>
    </div>
  );
}

function SidebarLink({
  onClick,
  icon: Icon,
  children,
}: {
  onClick: () => void;
  icon: typeof ListChecks;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm text-cream-muted hover:text-gold hover:bg-t700 transition-colors text-left"
    >
      <Icon className="w-4 h-4" /> {children}
    </button>
  );
}
