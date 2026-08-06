import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Horse } from "@/game/types";

interface PrivateTrialFormProps {
  distance: number;
  setDistance: (d: number) => void;
  surface: "Turf" | "Dirt" | "Synthetic";
  setSurface: (s: "Turf" | "Dirt" | "Synthetic") => void;
  opponentId: string;
  setOpponentId: (id: string) => void;
  eligibleOpponents: Horse[];
  horse: Horse;
  cash: number;
  loading: boolean;
  onStart: () => void;
}

const DISTANCES = [
  { value: 1000, label: "1000m (5F)" },
  { value: 1200, label: "1200m (6F)" },
  { value: 1400, label: "1400m (7F)" },
  { value: 1600, label: "1600m (1M)" },
  { value: 1800, label: "1800m (9F)" },
  { value: 2000, label: "2000m (10F)" },
  { value: 2400, label: "2400m (12F)" },
];

export function PrivateTrialForm({
  distance,
  setDistance,
  surface,
  setSurface,
  opponentId,
  setOpponentId,
  eligibleOpponents,
  horse,
  cash,
  loading,
  onStart,
}: PrivateTrialFormProps) {
  return (
    <div className="space-y-6 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-wider text-cream/60">
            Distance
          </Label>
          <Select value={String(distance)} onValueChange={(v) => setDistance(Number(v))}>
            <SelectTrigger className="bg-slate-900 border-white/5 rounded-none text-cream font-mono uppercase">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/5 text-cream rounded-none uppercase font-mono">
              {DISTANCES.map((d) => (
                <SelectItem key={d.value} value={String(d.value)}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-wider text-cream/60">
            Surface
          </Label>
          <Select
            value={surface}
            onValueChange={(v: "Turf" | "Dirt" | "Synthetic") => setSurface(v)}
          >
            <SelectTrigger className="bg-slate-900 border-white/5 rounded-none text-cream font-mono uppercase">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/5 text-cream rounded-none uppercase font-mono">
              <SelectItem value="Turf">Turf</SelectItem>
              <SelectItem value="Dirt">Dirt</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-wider text-cream/60">
            Opponent
          </Label>
          <Select value={opponentId} onValueChange={setOpponentId}>
            <SelectTrigger className="bg-slate-900 border-white/5 rounded-none text-cream font-mono uppercase">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/5 text-cream rounded-none uppercase font-mono">
              <SelectItem value="pacemaker">Pacemaker (AI)</SelectItem>
              {eligibleOpponents.map((opp) => (
                <SelectItem key={opp.id} value={opp.id}>
                  {opp.name} ({opp.energy} energy)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/5 p-4 space-y-2 text-xs font-mono uppercase tracking-wider text-cream-muted">
        <div className="flex justify-between">
          <span>Cost:</span>
          <span className="text-gold font-bold">$250</span>
        </div>
        <div className="flex justify-between">
          <span>{horse.name} energy requirement:</span>
          <span className="text-warning font-bold">-20 energy</span>
        </div>
        {opponentId !== "pacemaker" && (
          <div className="flex justify-between">
            <span>Opponent energy requirement:</span>
            <span className="text-warning font-bold">-15 energy</span>
          </div>
        )}
      </div>

      <Button
        onClick={onStart}
        disabled={loading}
        className="w-full bg-blue-500 hover:bg-blue-400 text-slate-950 font-black uppercase tracking-widest text-xs h-10 rounded-none shadow-lg"
      >
        {loading ? "Simulating Trial..." : "Simulate Trial"}
      </Button>
    </div>
  );
}
