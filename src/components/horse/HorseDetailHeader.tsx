import { Badge } from "@/components/ui/badge";
import { SilkDot } from "@/components/SilkDot";
import { ShieldCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

interface HorseDetailHeaderProps {
  horse: any;
  ovr: number;
}

export function HorseDetailHeader({ horse, ovr }: HorseDetailHeaderProps) {
  return (
    <div className="bg-slate-950 border border-white/5 p-8 relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
        <ShieldCheck className="h-64 w-64 -rotate-12" />
      </div>

      <div className="relative flex flex-col md:flex-row gap-8 items-start">
        <div className="relative">
          <SilkDot color={horse.silk} size="lg" />
          <div className="absolute -bottom-2 -right-2 bg-slate-900 border border-gold/40 text-gold font-mono text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg">
            {String(ovr).padStart(2, "0")}
          </div>
        </div>

        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="border-gold/30 text-gold-muted font-mono text-[9px] uppercase tracking-[0.2em] h-5 rounded-none px-2 bg-gold/5"
            >
              IDENT: {horse.id.substring(0, 8).toUpperCase()}
            </Badge>
            {horse.activeInjury && (
              <Badge
                variant="destructive"
                className="font-black text-[9px] uppercase tracking-widest h-5 rounded-none animate-pulse"
              >
                Critical
              </Badge>
            )}
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-cream font-[family-name:var(--font-display)] uppercase">
            {horse.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
            <div className="space-y-0.5">
              <span className="block text-[9px] uppercase font-black tracking-widest text-cream/20 leading-none">
                Vitals
              </span>
              <span className="text-xs font-mono text-cream/60">
                Age: {Math.floor(horse.age)} · {horse.gender}
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[9px] uppercase font-black tracking-widest text-cream/20 leading-none">
                Pedigree Family
              </span>
              <span className="text-xs font-mono text-cream/60">
                BL_{horse.bruceLoweFamily ?? "NA"}
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[9px] uppercase font-black tracking-widest text-cream/20 leading-none">
                Active Status
              </span>
              <span
                className={cn(
                  "text-xs font-mono font-bold",
                  horse.lifecycleStatus === "active" ? "text-success" : "text-cream/40",
                )}
              >
                {horse.lifecycleStatus.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
          <div className="bg-black/40 border border-white/5 p-3 text-center min-w-[100px]">
            <div className="text-[9px] font-black uppercase text-cream/20 tracking-tighter mb-1">
              Potential
            </div>
            <div className="text-2xl font-bold font-mono text-gold-bright">{horse.potential}</div>
          </div>
          <div className="bg-black/40 border border-white/5 p-3 text-center min-w-[100px]">
            <div className="text-[9px] font-black uppercase text-cream/20 tracking-tighter mb-1">
              Energy
            </div>
            <div
              className={cn(
                "text-2xl font-bold font-mono",
                horse.energy > 50 ? "text-success" : "text-warning",
              )}
            >
              {horse.energy}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
