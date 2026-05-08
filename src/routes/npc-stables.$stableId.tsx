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
import { getStableById } from "@/game/npcStables";
import { PERSONALITY_CONFIG } from "@/core/stable/stableConfig";
import { calculateScoutCost } from "@/game/scouting";
import { calculateLotValuation } from "@/game/auction";
import { getTierColor, getReputationStars } from "@/core/stable/uiHelpers";
import { HorseCard } from "@/components/HorseCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { TrophyCase } from "@/components/awards";
import { NumericValue, formatCurrency } from "@/components/HorseBits";
import { useState } from "react";
import type { Horse, PrivateSaleOffer } from "@/game/types";

export const Route = createFileRoute("/npc-stables/$stableId")({ component: NpcStableDetailPage });

function getDeclineFlavour(personality: string, stableName: string): string {
  switch (personality) {
    case "aggressive":
      return "Not for sale at that price. Try harder.";
    case "prestige":
      return "This horse is not for sale to just anyone.";
    case "conservative":
      return "We don't sell below market.";
    case "breeder":
      return "We intend to breed from this horse.";
    default:
      return `${stableName} declined your offer.`;
  }
}

function NpcStableDetailPage() {
  const { stableId } = Route.useParams();
  const npcStables = useNpcStables();
  const horses = useHorses();
  const day = useDay();
  const cash = useCash();
  const awards = useAwards();
  const scoutHorse = useGame((s) => s.scoutHorse);
  const proposePrivateSale = useGame((s) => s.proposePrivateSale);
  const respondToPrivateSale = useGame((s) => s.respondToPrivateSale);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const privateSaleOffers: PrivateSaleOffer[] = (useGame as any)(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => s.privateSaleOffers ?? [],
  );

  // Offer dialog state
  const [offerHorse, setOfferHorse] = useState<Horse | null>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerError, setOfferError] = useState("");

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
  const colts = stableHorses.filter((h: Horse) => h.gender === "colt" || h.gender === "horse");
  const fillies = stableHorses.filter((h: Horse) => h.gender === "filly" || h.gender === "mare");

  function handleSubmitOffer() {
    if (!offerHorse) return;
    const amount = Number(offerAmount.replace(/,/g, "").replace(/\$/g, ""));
    if (!amount || amount <= 0) {
      setOfferError("Please enter a valid offer amount.");
      return;
    }
    if (cash < amount) {
      setOfferError(`Insufficient funds. You need ${formatCurrency(amount - cash)} more.`);
      return;
    }
    const result = proposePrivateSale(offerHorse.id, stableId, amount);
    if (!result.ok) {
      if (result.reason === "insufficient_funds") {
        setOfferError(`Insufficient funds.`);
      } else {
        setOfferError(result.reason ?? "Offer failed.");
      }
      return;
    }
    // Close dialog
    setOfferHorse(null);
    setOfferAmount("");
    setOfferError("");
    // Show outcome toast — read fresh store state after the action
    const status = result.reason; // proposePrivateSale returns the offer status as reason on ok
    if (status === "accepted") {
      toast.success(
        `${stable?.name || "the stable"} accepted your offer of ${formatCurrency(amount)} for ${offerHorse.name}. They join your stable.`,
      );
    } else if (status === "countered") {
      // Read the fresh store state synchronously to get counter amount
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const freshOffers = (useGame.getState() as any).privateSaleOffers ?? [];
      const counterOffer = freshOffers.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (o: any) => o.horseId === offerHorse.id && o.status === "countered",
      );
      const counterAmt = counterOffer?.counterAmount ?? 0;
      toast.info(
        `${stable?.name || "the stable"} countered at ${formatCurrency(counterAmt)}. Go to Rival Stables to respond.`,
      );
    } else {
      toast.error(stable ? getDeclineFlavour(stable.personality, stable.name) : "Offer declined");
    }
  }

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
                <DollarSign className="w-4 h-4" />${formatCurrency(stable.cash)}
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
                      onClick={() => {
                        setOfferHorse(horse);
                        setOfferAmount("");
                        setOfferError("");
                      }}
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
                {activeOffer?.status === "countered" &&
                  activeOffer.counterAmount !== undefined &&
                  (() => {
                    const counterAmt = activeOffer.counterAmount!;
                    const canAffordCounter = cash >= counterAmt;
                    return (
                      <Card className="border-warning/40 bg-warning/5">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-sm">
                                Counter offer from {stable.name}:{" "}
                                <span className="tabular-nums font-bold">
                                  {formatCurrency(counterAmt)}
                                </span>
                              </p>
                              <p className="text-xs text-cream-muted">
                                Expires day {activeOffer.expiresDay}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                respondToPrivateSale(activeOffer.id, false);
                                toast.info("Counter declined.");
                              }}
                            >
                              Decline
                            </Button>
                            {canAffordCounter ? (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    Accept {formatCurrency(counterAmt)}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Accept counter offer?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      You will pay {formatCurrency(counterAmt)} for {horse.name}.
                                      This cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => {
                                        const r = respondToPrivateSale(activeOffer.id, true);
                                        if (r.ok) {
                                          toast.success(
                                            `${horse.name} joins your stable for ${formatCurrency(counterAmt)}.`,
                                          );
                                        } else {
                                          toast.error(r.reason ?? "Could not accept.");
                                        }
                                      }}
                                    >
                                      Accept
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                                title="Insufficient funds"
                              >
                                Accept {formatCurrency(counterAmt)}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
              </div>
            );
          })}
        </div>

        {stableHorses.length === 0 && (
          <p className="text-cream-muted text-center py-8">No horses currently in this stable.</p>
        )}
      </div>

      {/* D2 — Make an Offer dialog */}
      <Dialog
        open={!!offerHorse}
        onOpenChange={(open) => {
          if (!open) {
            setOfferHorse(null);
            setOfferError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make an offer for {offerHorse?.name}</DialogTitle>
          </DialogHeader>
          {offerHorse &&
            (() => {
              const valuation = calculateLotValuation(offerHorse, stable, "racing_age", horses);
              const fogLow = Math.round(valuation * 0.8);
              const fogHigh = Math.round(valuation * 1.2);
              return (
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-cream-muted">
                    Estimated market value:{" "}
                    <span className="tabular-nums font-medium text-cream">
                      ~{formatCurrency(fogLow)} – {formatCurrency(fogHigh)}
                    </span>
                  </p>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Your offer amount</label>
                    <Input
                      inputMode="numeric"
                      placeholder="e.g. 25000"
                      value={offerAmount}
                      onChange={(e) => {
                        setOfferAmount(e.target.value);
                        setOfferError("");
                      }}
                      className="tabular-nums"
                      onBlur={() => {
                        const n = Number(offerAmount.replace(/,/g, "").replace(/\$/g, ""));
                        if (n > 0) setOfferAmount(formatCurrency(n));
                      }}
                    />
                    {offerError && <p className="text-xs text-destructive">{offerError}</p>}
                  </div>
                </div>
              );
            })()}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setOfferHorse(null);
                setOfferError("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitOffer}>Submit Offer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
