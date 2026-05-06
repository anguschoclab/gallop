import { useState, useMemo } from "react";
import { useGame } from "@/game/store";
import { useJockeys } from "@/game/hooks/useSystemsState";
import { shallow } from "zustand/shallow";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Horse, Race, Jockey } from "@/game/types";
import { calculateOverallRating } from "@/core/horse/stats";
import { isHorseEligibleForRace } from "@/core/race/eligibility";
import { Check, ChevronRight, User, Info, AlertTriangle, Truck } from "lucide-react";
import { JockeyCard } from "./JockeyCard";
import { RacingSilks } from "./RacingSilks";
import { HorsePortrait, HorsePortraitBadge } from "./HorsePortrait";
import { getCurrentYear } from "@/game/raceSchedule";

interface RaceEntryProps {
  race: Race;
  isOpen: boolean;
  onClose: () => void;
}

export function RaceEntry({ race, isOpen, onClose }: RaceEntryProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const [selectedJockeyId, setSelectedJockeyId] = useState<string | null>(null);
  const [wantToClaim, setWantToClaim] = useState(false);

  const allHorses = (useGame as any)((s: any) => s.horses, shallow);
  const horses = useMemo(() => allHorses.filter((h: any) => h.owned), [allHorses]);
  const jockeys = (useGame as any)((s: any) => s.jockeys ?? [], shallow);
  const enterRace = useGame((s) => s.enterRace);
  const assignJockey = useGame((s) => s.assignJockey);
  const submitClaim = useGame((s) => s.submitClaim);
  const withdrawClaim = useGame((s) => s.withdrawClaim);
  const cash = useGame((s) => s.cash);
  const day = useGame((s) => s.day);

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
    return horses.map((h) => ({
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
      const res = enterRace(race.id, selectedHorseId);
      if (res.ok) {
        assignJockey(race.id, selectedHorseId, selectedJockeyId);

        // Submit claim if selected
        if (wantToClaim && race.claimingPrice) {
          const claimRes = submitClaim(race.id, selectedHorseId);
          if (!claimRes.ok) {
            alert(`Claim failed: ${claimRes.reason}`);
            return;
          }
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
            {[1, 2, 3, 4].map((s) => (
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
                {eligibleHorses.map(({ horse, eligible }) => (
                  <button
                    key={horse.id}
                    disabled={!eligible}
                    onClick={() => setSelectedHorseId(horse.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      selectedHorseId === horse.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted hover:bg-muted/80"
                    } ${!eligible ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <HorsePortraitBadge coatColor={horse.coatColor} size="sm" />
                      <div className="text-left">
                        <div className="font-bold flex items-center gap-2">
                          {horse.name}
                          {isHorseQualifiedForRace(horse, race) && (
                            <Badge className="bg-primary text-primary-foreground text-[10px]">
                              Qualified
                            </Badge>
                          )}
                        </div>
                        <div className="text-[10px] uppercase text-muted-foreground">
                          Rating {calculateOverallRating(horse)} · Energy {horse.energy}%
                        </div>
                      </div>
                    </div>
                    {selectedHorseId === horse.id && <Check className="text-primary" size={20} />}
                  </button>
                ))}
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

          {step === 3 && selectedHorse && selectedJockey && (
            <div className="space-y-6 animate-in zoom-in-95 duration-300">
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground text-center">
                Final Review
              </h3>

              <div className="flex justify-around items-center gap-4 bg-muted p-6 rounded-2xl border border-border relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

                <div className="flex flex-col items-center gap-2">
                  <HorsePortrait coatColor={selectedHorse.coatColor} size="md" />
                  <div className="font-black uppercase tracking-tighter text-center leading-none">
                    {selectedHorse.name}
                  </div>
                </div>

                <ChevronRight className="text-muted-foreground/30" />

                <div className="flex flex-col items-center gap-2">
                  <div className="h-12 w-12 rounded-md bg-muted border-2 border-primary/20 flex items-center justify-center overflow-hidden">
                    <RacingSilks silk={selectedJockey.silk} size={44} />
                  </div>
                  <div className="font-black uppercase tracking-tighter text-center leading-none">
                    {selectedJockey.name}
                  </div>
                </div>
              </div>

              <div className="space-y-2 px-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entry Fee</span>
                  <span
                    className={`font-bold tabular-nums ${isHorseQualifiedForRace(selectedHorse, race) ? "text-primary" : ""}`}
                  >
                    {isHorseQualifiedForRace(selectedHorse, race)
                      ? "WAIVED"
                      : `$${race.entryFee.toLocaleString()}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Jockey Riding Fee</span>
                  <span className="font-bold tabular-nums">
                    ${selectedJockey.ridingFee.toLocaleString()}
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
                    {(isHorseQualifiedForRace(selectedHorse, race)
                      ? 0
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
                          : 150)
                    ).toLocaleString()}
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

          {step === 4 && selectedHorse && race.claimingPrice && (
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
                      If you win the claim, you'll pay ${race.claimingPrice.toLocaleString()} and
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
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
              className="uppercase font-black tracking-widest text-[10px]"
            >
              Back
            </Button>
          )}
          <div className="flex-1" />
          {step < 4 ? (
            <Button
              disabled={(step === 1 && !selectedHorseId) || (step === 2 && !selectedJockeyId)}
              onClick={() => {
                if (step === 3 && race.claimingPrice) {
                  setStep(4);
                } else {
                  setStep((s) => (s + 1) as any);
                }
              }}
              className="uppercase font-black tracking-widest text-[10px]"
            >
              Next Step
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
