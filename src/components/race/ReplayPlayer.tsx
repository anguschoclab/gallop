import { useGameWithShallow } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Clock, MapPin } from "lucide-react";
import type { RaceReplay } from "@/core/replays/replayTypes";

interface ReplayPlayerProps {
  raceId: string;
}

export function ReplayPlayer({ raceId }: ReplayPlayerProps) {
  const replay = useGameWithShallow((s) => s.replays?.find((r: RaceReplay) => r.raceId === raceId));

  if (!replay) return null;

  return (
    <Card className="border-gold/30 bg-slate-900/40 overflow-hidden">
      <CardHeader className="bg-gold/5 border-b border-gold/10">
        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 text-gold">
          <Play size={16} />
          Replay Available
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] text-gold/60 uppercase font-black tracking-widest">
              Race Day
            </p>
            <div className="text-xl font-black italic text-gold-bright tabular-nums">
              {replay.day}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-gold/60 uppercase font-black tracking-widest">
              Distance
            </p>
            <div className="text-xl font-black italic text-gold tabular-nums">
              {replay.distance.toLocaleString()}m
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-gold/60 uppercase font-black tracking-widest">
              Checkpoints
            </p>
            <div className="text-xl font-black italic text-gold tabular-nums">
              {replay.checkpoints.length}
            </div>
          </div>
        </div>

        <div className="h-px bg-gold/10" />

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-gold" />
            <h4 className="text-xs font-black uppercase tracking-widest text-gold">
              Final Positions
            </h4>
          </div>
          <div className="space-y-1">
            {replay.finalPositions
              .sort((a, b) => a.position - b.position)
              .map((pos) => (
                <div
                  key={pos.horseId}
                  className="flex justify-between text-sm border-b border-gold/5 pb-1"
                >
                  <span className="text-cream/70 font-mono">
                    #{pos.position} {pos.horseId}
                  </span>
                  <span className="font-bold tabular-nums text-gold">{pos.time.toFixed(2)}s</span>
                </div>
              ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-gold/40 italic">
          <MapPin size={12} />
          <span>Track: {replay.trackId}</span>
        </div>
      </CardContent>
    </Card>
  );
}
