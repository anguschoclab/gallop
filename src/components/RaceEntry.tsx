import { useState, useMemo } from "react";
import { useGame } from "@/game/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Horse, Race, Jockey } from "@/game/types";
import { calculateOverallRating } from "@/core/horse/stats";
import { isHorseEligibleForRace } from "@/core/race/eligibility";
import { Check, ChevronRight, User, Info, AlertTriangle } from "lucide-react";
import { JockeyCard } from "./JockeyCard";

interface RaceEntryProps {
  race: Race;
  isOpen: boolean;
  onClose: () => void;
}

export function RaceEntry({ race, isOpen, onClose }: RaceEntryProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const [selectedJockeyId, setSelectedJockeyId] = useState<string | null>(null);
  
  const horses = useGame((s) => s.horses.filter(h => h.owned));
  const jockeys = useGame((s) => s.jockeys);
  const enterRace = useGame((s) => s.enterRace);
  const assignJockey = useGame((s) => s.assignJockey);
  const cash = useGame((s) => s.cash);

  const selectedHorse = useMemo(() => horses.find(h => h.id === selectedHorseId), [horses, selectedHorseId]);
  const selectedJockey = useMemo(() => jockeys.find(j => j.id === selectedJockeyId), [jockeys, selectedJockeyId]);

  const eligibleHorses = useMemo(() => {
    return horses.map(h => ({
      horse: h,
      eligible: isHorseEligibleForRace(h, race, new Set()),
    }));
  }, [horses, race]);

  const marketJockeys = useMemo(() => {
    // Retained jockeys + freelance pool
    return jockeys.filter(j => !j.stableId || j.contractUntil); // Simple filter for now
  }, [jockeys]);

  const handleConfirm = () => {
    if (selectedHorseId && selectedJockeyId) {
      const res = enterRace(race.id, selectedHorseId);
      if (res.ok) {
        assignJockey(race.id, selectedHorseId, selectedJockeyId);
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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase italic text-primary flex items-center gap-2">
            Race Entry: {race.name}
          </DialogTitle>
          <div className="flex gap-1 mt-2">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1 flex-1 rounded-full ${step >= s ? "bg-primary" : "bg-white/10"}`} />
            ))}
          </div>
        </DialogHeader>

        <div className="py-4 min-h-[400px]">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Select Horse</h3>
              <div className="grid grid-cols-1 gap-2">
                {eligibleHorses.map(({ horse, eligible }) => (
                  <button
                    key={horse.id}
                    disabled={!eligible}
                    onClick={() => setSelectedHorseId(horse.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      selectedHorseId === horse.id 
                        ? "border-primary bg-primary/10" 
                        : "border-white/5 bg-white/5 hover:bg-white/10"
                    } ${!eligible ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: horse.silk }} />
                      <div className="text-left">
                        <div className="font-bold">{horse.name}</div>
                        <div className="text-[10px] uppercase text-muted-foreground">Rating {calculateOverallRating(horse)} · Energy {horse.energy}%</div>
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
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Select Jockey</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {marketJockeys.slice(0, 6).map(j => (
                  <div 
                    key={j.id} 
                    onClick={() => setSelectedJockeyId(j.id)}
                    className={`cursor-pointer transition-all ${selectedJockeyId === j.id ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-xl" : ""}`}
                  >
                    <div className="relative">
                      <JockeyCard jockey={j} isRetained={!!j.contractUntil} />
                      <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                        getCompatibility(selectedHorse, j) === "High" ? "bg-success text-success-foreground" :
                        getCompatibility(selectedHorse, j) === "Poor" ? "bg-destructive text-destructive-foreground" :
                        "bg-white/20 text-white"
                      }`}>
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
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground text-center">Final Review</h3>
              
              <div className="flex justify-around items-center gap-4 bg-white/5 p-6 rounded-2xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                
                <div className="flex flex-col items-center gap-2">
                  <div className="h-12 w-12 rounded-full border-2 border-white/20" style={{ backgroundColor: selectedHorse.silk }} />
                  <div className="font-black uppercase tracking-tighter text-center leading-none">
                    {selectedHorse.name}
                  </div>
                </div>
                
                <ChevronRight className="text-muted-foreground/30" />
                
                <div className="flex flex-col items-center gap-2">
                  <div className="h-12 w-12 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary">
                    <User />
                  </div>
                  <div className="font-black uppercase tracking-tighter text-center leading-none">
                    {selectedJockey.name}
                  </div>
                </div>
              </div>

              <div className="space-y-2 px-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entry Fee</span>
                  <span className="font-bold tabular-nums">${race.entryFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Jockey Riding Fee</span>
                  <span className="font-bold tabular-nums">${selectedJockey.ridingFee.toLocaleString()}</span>
                </div>
                <div className="h-px bg-white/10 my-2" />
                <div className="flex justify-between text-lg font-black uppercase">
                  <span>Total Due</span>
                  <span className="text-primary tabular-nums">${(race.entryFee + selectedJockey.ridingFee).toLocaleString()}</span>
                </div>
              </div>

              {cash < (race.entryFee + selectedJockey.ridingFee) && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex gap-3 text-destructive">
                  <AlertTriangle size={18} className="shrink-0" />
                  <p className="text-xs font-bold">Insufficient cash to cover the total entry cost.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between items-center">
          {step > 1 && (
            <Button variant="ghost" onClick={() => setStep(s => (s - 1) as any)} className="uppercase font-black tracking-widest text-[10px]">
              Back
            </Button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <Button 
              disabled={(step === 1 && !selectedHorseId) || (step === 2 && !selectedJockeyId)}
              onClick={() => setStep(s => (s + 1) as any)}
              className="uppercase font-black tracking-widest text-[10px]"
            >
              Next Step
              <ChevronRight size={14} className="ml-1" />
            </Button>
          ) : (
            <Button 
              onClick={handleConfirm}
              disabled={cash < (race.entryFee + selectedJockey!.ridingFee)}
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
