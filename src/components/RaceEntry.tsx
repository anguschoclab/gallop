import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useGame, useGameWithShallow } from "@/game/store";
import { useJockeys } from "@/game/hooks/useSystemsState";
import { shallow } from "zustand/shallow";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Horse, Race, Jockey } from "@/game/types";
import { calculateOverallRating } from "@/core/horse/stats";
import { isHorseEligibleForRace } from "@/core/race/eligibility";
import { Check, ChevronRight, User, Info, AlertTriangle, Truck } from "lucide-react";
import { JockeyCard } from "./JockeyCard";
import { JockeyAvatar } from "./JockeyAvatar";
import { HorsePortrait, HorsePortraitBadge } from "./HorsePortrait";
import { getCurrentYear } from "@/game/raceSchedule";
import { formatCurrency } from "@/lib/formatting";
import { toast } from "sonner";

interface RaceEntryProps {
  race: Race;
  isOpen: boolean;
  onClose: () => void;
}

export function RaceEntry({ race, isOpen, onClose }: RaceEntryProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const [selectedJockeyId, setSelectedJockeyId] = useState<string | null>(null);
  const [selectedTactics, setSelectedTactics] = useState<
    "lead" | "rail" | "outside" | "save" | "late_kick" | "default"
  >("default");
  const [wantToClaim, setWantToClaim] = useState(false);

  const allHorses = useGameWithShallow((s) => s.horses);
  const horses = useMemo(() => allHorses.filter((h: Horse) => h.owned), [allHorses]);
  const jockeys = useGameWithShallow((s) => s.jockeys ?? []);
  const enterRace = useGame((s) => s.enterRace);
  const enterClaimingRace = useGame((s) => s.enterClaimingRace);
  const withdrawFromClaimingRace = useGame((s) => s.withdrawFromClaimingRace);
  const assignJockey = useGame((s) => s.assignJockey);
  const setRaceTactics = useGame((s) => s.setRaceTactics);
  const submitClaim = useGame((s) => s.submitClaim);
  const withdrawClaim = useGame((s) => s.withdrawClaim);
  const withdrawRace = useGame((s) => s.withdrawRace);
  const cash = useGame((s) => s.cash);
  const day = useGame((s) => s.day);
  // D3: determine if this is a new-spec claiming race
  const isNewClaimingRace = !!race.claiming;
  const claimingPrice = race.claiming?.price ?? race.claimingPrice;

  const selectedHorse = useMemo(
    () => horses.find((h: Horse) => h.id === selectedHorseId),
    [horses, selectedHorseId],
  );
  const selectedJockey = useMemo(
    () => jockeys.find((j: Jockey) => j.id === selectedJockeyId),
    [jockeys, selectedJockeyId],
  );

  const isHorseQualifiedForRace = (horse: Horse, race: Race): boolean => {
    if (!race.graded?.key || !horse.winAndYouInQualified) return false;
    const currentYear = getCurrentYear(day);
    return horse.winAndYouInQualified.some(
      (q) => q.raceKey === race.graded!.key && q.year === currentYear,
    );
  };

  const eligibleHorses = useMemo(() => {
    return horses.map((h: Horse) => ({
      horse: h,
      eligible: isHorseEligibleForRace(h, race, new Set()),
    }));
  }, [horses, race]);

  const marketJockeys = useMemo(() => {
    // Retained jockeys + freelance pool
    return jockeys.filter((j: Jockey) => !j.stableId || j.contractUntil); // Simple filter for now
  }, [jockeys]);

  const handleConfirm = () => {
    if (selectedHorseId && selectedJockeyId) {
      // D3: use enterClaimingRace for new claiming races
      const res = isNewClaimingRace
        ? enterClaimingRace(race.id, selectedHorseId)
        : enterRace(race.id, selectedHorseId);
      if (res.ok) {
        assignJockey(race.id, selectedHorseId, selectedJockeyId);
        setRaceTactics(race.id, selectedHorseId, selectedTactics);

        // Submit claim if selected (old-style claimingPrice)
        if (wantToClaim && race.claimingPrice && !isNewClaimingRace) {
          const claimRes = submitClaim(race.id, selectedHorseId);
          if (!claimRes.ok) {
            alert(`Claim failed: ${claimRes.reason}`);
            return;
          }
        }

        if (isNewClaimingRace) {
          const horse = horses.find((h: Horse) => h.id === selectedHorseId);
          toast.info(
            `${horse?.name ?? "Horse"} entered in claiming race at ${formatCurrency(claimingPrice!)}.`,
          );
        }

        onClose();
      } else {
        alert(res.reason);
      }
    }
  };

  const getCompatibility = (horse: Horse, jockey: Jockey) => {
    const style = horse.runningStyle;
    const arch = jockey.archetype;

    if (arch === "versatile" || arch === "clinical") return "High";

    // Front-end speed horses (E/EP) pair with front_runner
    if ((style === "E" || style === "EP") && arch === "front_runner") return "High";
    // Closers (S) pair with closer/finisher
    if (style === "S" && (arch === "closer" || arch === "finisher")) return "High";
    if (style === "P" && arch === "closer") return "Good";
    if (style === "P" && arch === "finisher") return "Good";

    // Mismatches
    if ((style === "E" || style === "EP") && arch === "closer") return "Poor";
    if (style === "S" && arch === "front_runner") return "Poor";

    return "Neutral";
  };

  const TACTIC_OPTIONS = [
    {
      id: "default",
      name: "Default",
      desc: "Jockey will use their best judgment based on horse style.",
    },
    {
      id: "lead",
      name: "Lead at all costs",
      desc: "Aggressive push for the front. High speed boost but drains stamina fast.",
    },
    {
      id: "rail",
      name: "Hug the Rail",
      desc: "Stay in lane 0. Saves distance but risks getting boxed in.",
    },
    {
      id: "outside",
      name: "Stay Outside",
      desc: "Avoid traffic by staying wide. No boxing risk but covers more ground.",
    },
    { id: "save", name: "Save Ground", desc: "Prioritize drafting behind other horses." },
    {
      id: "late_kick",
      name: "Late Kick",
      desc: "Sit back and conserve energy for a massive boost in the final 20%.",
    },
  ] as const;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-2xl bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase italic text-primary flex items-center gap-2">
            Race Entry: {race.name}
          </DialogTitle>
          <div className="flex gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${step >= s ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="py-4 min-h-[400px]">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                Select Horse
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {eligibleHorses.map(({ horse, eligible }) => {
                  const isEntered = race.entries.some((e) => e.horseId === horse.id);
                  return (
                    <div
                      key={horse.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                        selectedHorseId === horse.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-muted hover:bg-muted/80"
                      } ${!eligible && !isEntered ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
                    >
                      <button
                        disabled={!eligible && !isEntered}
                        onClick={() => setSelectedHorseId(horse.id)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        <HorsePortraitBadge
                          id={horse.id}
                          coatColor={horse.coatColor}
                          markings={horse.markings}
                          gender={horse.gender}
                          appearance={horse.appearance}
                          size="sm"
                        />
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            {horse.name}
                            {isEntered && (
                              <Badge className="bg-yellow-500 text-yellow-950 text-[10px]">
                                Entered
                              </Badge>
                            )}
                            {isHorseQualifiedForRace(horse, race) && (
                              <Badge className="bg-primary text-primary-foreground text-[10px]">
                                Qualified
                              </Badge>
                            )}
                            {(() => {
                              const trackId = race.trackId || race.graded?.trackId;
                              if (trackId && horse.courseVisits) {
                                const visits = horse.courseVisits[trackId] || 0;
                                if (visits > 0) {
                                  const bonus = Math.min(visits * 0.5, 5); // Display as percentage
                                  return (
                                    <Badge className="bg-blue-500 text-white text-[10px]" title={`${visits} visits at this track`}>
                                      Track Familiarity +{bonus.toFixed(1)}%
                                    </Badge>
                                  );
                                }
                              }
                              return null;
                            })()}
                          </div>
                          <div className="text-[10px] uppercase text-muted-foreground">
                            Rating {calculateOverallRating(horse)} · Energy {horse.energy}%
                          </div>
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        {isEntered &&
                          isNewClaimingRace &&
                          (() => {
                            const canWithdraw = day < race.day - 1;
                            return (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px] uppercase font-black tracking-wider"
                                disabled={!canWithdraw}
                                title={canWithdraw ? undefined : "Withdrawal closed"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (canWithdraw) {
                                    withdrawFromClaimingRace(race.id, horse.id);
                                    toast.success(`${horse.name} withdrawn from ${race.name}.`);
                                    onClose();
                                  }
                                }}
                              >
                                {canWithdraw ? "Withdraw" : "Withdrawal closed"}
                              </Button>
                            );
                          })()}
                        {isEntered && !isNewClaimingRace && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="text-[10px] uppercase font-black tracking-wider"
                            onClick={(e) => {
                              e.stopPropagation();
                              const res = withdrawRace(race.id, horse.id);
                              if (res.ok) {
                                alert(`${horse.name} withdrawn from ${race.name}`);
                                onClose();
                              } else {
                                alert(`Withdrawal failed: ${res.reason}`);
                              }
                            }}
                          >
                            Withdraw
                          </Button>
                        )}
                        {selectedHorseId === horse.id && !isEntered && (
                          <Check className="text-primary" size={20} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && selectedHorse && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                Select Jockey
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {marketJockeys.slice(0, 6).map((j: Jockey) => (
                  <div
                    key={j.id}
                    onClick={() => setSelectedJockeyId(j.id)}
                    className={`cursor-pointer transition-all ${selectedJockeyId === j.id ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-xl" : ""}`}
                  >
                    <div className="relative">
                      <JockeyCard jockey={j} isRetained={!!j.contractUntil} />
                      <div
                        className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                          getCompatibility(selectedHorse, j) === "High"
                            ? "bg-success text-success-foreground"
                            : getCompatibility(selectedHorse, j) === "Poor"
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {getCompatibility(selectedHorse, j)} Match
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && selectedHorse && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                Tactical Instructions
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {TACTIC_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedTactics(opt.id as any)}
                    className={`flex flex-col p-3 rounded-lg border text-left transition-all ${
                      selectedTactics === opt.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted hover:bg-muted/80"
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-bold">{opt.name}</span>
                      {selectedTactics === opt.id && <Check className="text-primary" size={16} />}
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && selectedHorse && selectedJockey && (
            <div className="space-y-6 animate-in zoom-in-95 duration-300">
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground text-center">
                Final Review
              </h3>
              {/* D3 — Claiming race risk warning */}
              {isNewClaimingRace && claimingPrice && (
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex gap-3 text-warning">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <p className="text-xs font-bold">
                    Claiming Race: Any stable may purchase {selectedHorse.name} for{" "}
                    {formatCurrency(claimingPrice)} after the race. The transfer is automatic. You
                    may withdraw up to 1 day before the race.
                  </p>
                </div>
              )}

              <div className="flex justify-around items-center gap-4 bg-muted p-6 rounded-2xl border border-border relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

                <div className="flex flex-col items-center gap-2">
                  <HorsePortrait
                    id={selectedHorse.id}
                    coatColor={selectedHorse.coatColor}
                    markings={selectedHorse.markings}
                    gender={selectedHorse.gender}
                    appearance={selectedHorse.appearance}
                    size="md"
                  />
                  <Link
                    to="/stable/$horseId"
                    params={{ horseId: selectedHorse.id }}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-black uppercase tracking-tighter text-center leading-none hover:underline hover:text-gold"
                  >
                    {selectedHorse.name}
                  </Link>
                </div>

                <ChevronRight className="text-muted-foreground/30" />

                <div className="flex flex-col items-center gap-2">
                  <JockeyAvatar
                    jockey={selectedJockey}
                    size="md"
                    className="border-2 border-primary/20"
                  />
                  <Link
                    to="/jockey/$jockeyId"
                    params={{ jockeyId: selectedJockey.id }}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-black uppercase tracking-tighter text-center leading-none hover:underline hover:text-gold"
                  >
                    {selectedJockey.name}
                  </Link>
                </div>
              </div>

              <div className="space-y-2 px-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tactics</span>
                  <span className="font-bold uppercase text-primary">
                    {TACTIC_OPTIONS.find((t) => t.id === selectedTactics)?.name}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entry Fee</span>
                  <span
                    className={`font-bold tabular-nums ${isHorseQualifiedForRace(selectedHorse, race) ? "text-primary" : ""}`}
                  >
                    {isHorseQualifiedForRace(selectedHorse, race)
                      ? "WAIVED"
                      : formatCurrency(race.entryFee)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Jockey Riding Fee</span>
                  <span className="font-bold tabular-nums">
                    {formatCurrency(selectedJockey.ridingFee)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Truck size={14} />
                    Transport Cost
                  </span>
                  <span className="font-bold tabular-nums">
                    $
                    {race.graded
                      ? race.graded.grade === "G1"
                        ? 500
                        : race.graded.grade === "G2"
                          ? 400
                          : race.graded.grade === "G3"
                            ? 300
                            : 200
                      : 150}
                  </span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between text-lg font-black uppercase">
                  <span>Total Due</span>
                  <span className="text-primary tabular-nums">
                    $
                    {formatCurrency(
                      isHorseQualifiedForRace(selectedHorse, race)
                        ? selectedJockey.ridingFee +
                            (race.graded
                              ? race.graded.grade === "G1"
                                ? 500
                                : race.graded.grade === "G2"
                                  ? 400
                                  : race.graded.grade === "G3"
                                    ? 300
                                    : 200
                              : 150)
                        : race.entryFee +
                            selectedJockey.ridingFee +
                            (race.graded
                              ? race.graded.grade === "G1"
                                ? 500
                                : race.graded.grade === "G2"
                                  ? 400
                                  : race.graded.grade === "G3"
                                    ? 300
                                    : 200
                              : 150) +
                            (wantToClaim ? claimingPrice! : 0),
                    )}
                  </span>
                </div>
              </div>

              {cash <
                (isHorseQualifiedForRace(selectedHorse, race)
                  ? selectedJockey.ridingFee +
                    (race.graded
                      ? race.graded.grade === "G1"
                        ? 500
                        : race.graded.grade === "G2"
                          ? 400
                          : race.graded.grade === "G3"
                            ? 300
                            : 200
                      : 150)
                  : race.entryFee +
                    selectedJockey.ridingFee +
                    (race.graded
                      ? race.graded.grade === "G1"
                        ? 500
                        : race.graded.grade === "G2"
                          ? 400
                          : race.graded.grade === "G3"
                            ? 300
                            : 200
                      : 150)) && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex gap-3 text-destructive">
                  <AlertTriangle size={18} className="shrink-0" />
                  <p className="text-xs font-bold">
                    Insufficient cash to cover the total entry cost.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 5 && selectedHorse && race.claimingPrice && (
            <div className="space-y-6 animate-in zoom-in-95 duration-300">
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground text-center">
                Claiming Option
              </h3>

              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="claim-checkbox"
                    checked={wantToClaim}
                    onChange={(e) => setWantToClaim(e.target.checked)}
                    className="w-5 h-5 rounded border-primary"
                  />
                  <label htmlFor="claim-checkbox" className="flex-1">
                    <div className="font-bold">Claim this horse</div>
                    <div className="text-sm text-muted-foreground">
                      If you win the claim, you'll pay {formatCurrency(race.claimingPrice)} and
                      become the new owner. If another stable claims it, you'll lose the horse but
                      receive the claiming price.
                    </div>
                  </label>
                </div>

                {wantToClaim && (
                  <div className="mt-3 bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <p className="text-xs font-bold text-destructive">
                      Warning: If another stable claims this horse, it will be transferred to them
                      and you'll receive the claiming price.
                    </p>
                  </div>
                )}
              </div>

              {(race.raceClass === "OptionalClaiming" ||
                race.raceClass === "MaidenOptionalClaiming") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const res = withdrawClaim(race.id, selectedHorse.id);
                    if (res.ok) {
                      alert("Horse withdrawn from claiming (entry fee forfeited)");
                    } else {
                      alert(`Withdrawal failed: ${res.reason}`);
                    }
                  }}
                  className="w-full uppercase font-black tracking-widest text-[10px]"
                >
                  Withdraw Horse from Claiming
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between items-center">
          {step > 1 && (
            <Button
              variant="ghost"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5)}
              className="uppercase font-black tracking-widest text-[10px]"
            >
              Back
            </Button>
          )}
          <div className="flex-1" />
          {step < 5 ? (
            <Button
              disabled={(step === 1 && !selectedHorseId) || (step === 2 && !selectedJockeyId)}
              onClick={() => {
                if (step === 4 && race.claimingPrice) {
                  setStep(5);
                } else if (step === 4 && !race.claimingPrice) {
                  handleConfirm();
                } else {
                  setStep((s) => Math.min(s + 1, 5) as 1 | 2 | 3 | 4 | 5);
                }
              }}
              className="uppercase font-black tracking-widest text-[10px]"
            >
              {step === 4 && !race.claimingPrice ? "Confirm Entry" : "Next Step"}
              <ChevronRight size={14} className="ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleConfirm}
              disabled={
                cash <
                (selectedHorse && isHorseQualifiedForRace(selectedHorse, race)
                  ? selectedJockey!.ridingFee +
                    (race.graded
                      ? race.graded.grade === "G1"
                        ? 500
                        : race.graded.grade === "G2"
                          ? 400
                          : race.graded.grade === "G3"
                            ? 300
                            : 200
                      : 150)
                  : race.entryFee +
                    selectedJockey!.ridingFee +
                    (race.graded
                      ? race.graded.grade === "G1"
                        ? 500
                        : race.graded.grade === "G2"
                          ? 400
                          : race.graded.grade === "G3"
                            ? 300
                            : 200
                      : 150) +
                    (wantToClaim ? race.claimingPrice! : 0))
              }
              className="uppercase font-black tracking-widest text-[10px] bg-primary text-primary-foreground px-8"
            >
              Confirm Entry
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
