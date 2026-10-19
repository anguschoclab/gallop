import { Badge } from "@/shared/ui/badge";
import { SilkDot } from "@/domains/shell/ui/SilkDot";
import { HorsePortrait } from "@/domains/horse/ui/HorsePortrait";
import { BookmarkButton } from "@/domains/bookmarks/ui/BookmarkButton";
import { ShieldCheck, Users } from "lucide-react";
import { formatFanCount } from "@/domains/horse/ui/fanFormat";
import { cn } from "@/shared/lib/cn";
import type { Horse } from "@/platform/game/types";

interface HorseDetailHeaderProps {
  horse: Horse;
  ovr: number;
}

export function HorseDetailHeader({ horse, ovr }: HorseDetailHeaderProps) {
  return (
    <div className="bg-slate-950 border border-white/5 p-8 relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
        <ShieldCheck className="h-64 w-64 -rotate-12" />
      </div>

      <div className="relative flex flex-col md:flex-row gap-8 items-start">
        <div className="relative shrink-0">
          <HorsePortrait
            id={horse.id}
            coatColor={horse.coatColor}
            markings={horse.markings}
            gender={horse.gender}
            appearance={horse.appearance}
            view="head"
            size="lg"
            className="w-36 h-36 md:w-44 md:h-44 border border-white/10 shadow-xl"
            alt={`${horse.name} portrait`}
          />
          <div className="absolute -bottom-2 -left-2">
            <SilkDot color={horse.silk} size="sm" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-slate-900 border border-primary/40 text-primary font-mono text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg">
            {String(ovr).padStart(2, "0")}
          </div>
        </div>

        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="border-primary/30 text-primary/30 font-mono text-[9px] uppercase tracking-wide h-5 rounded-none px-2 bg-primary/5"
            >
              ID: {horse.id.substring(0, 8).toUpperCase()}
            </Badge>
            {horse.activeInjury && (
              <Badge
                variant="destructive"
                className="font-black text-[9px] uppercase tracking-wide h-5 rounded-none animate-pulse"
              >
                {horse.activeInjury.severity}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-5xl font-black tracking-tighter text-foreground font-[family-name:var(--font-display)] uppercase">
              {horse.name}
            </h1>
            <BookmarkButton
              type="horse"
              id={horse.id}
              label={horse.name}
              subtitle={`Age ${Math.floor(horse.age)} · ${horse.gender}`}
              variant="full"
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
            <div className="space-y-0.5">
              <span className="block text-[9px] uppercase font-black tracking-wide text-foreground/20 leading-none">
                Vitals
              </span>
              <span className="text-xs font-mono text-foreground/60">
                Age: {Math.floor(horse.age)} · {horse.gender}
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[9px] uppercase font-black tracking-wide text-foreground/20 leading-none">
                Pedigree Family
              </span>
              <span className="text-xs font-mono text-foreground/60">
                Family {horse.bruceLoweFamily ?? "—"}
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="block text-[9px] uppercase font-black tracking-wide text-foreground/20 leading-none">
                Active Status
              </span>
              <span
                className={cn(
                  "text-xs font-mono font-bold",
                  horse.lifecycleStatus === "active" ? "text-success" : "text-foreground/40",
                )}
              >
                {horse.lifecycleStatus.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
          <div className="bg-black/40 border border-white/5 p-3 text-center min-w-[100px]">
            <div className="text-[9px] font-black uppercase text-foreground/20 tracking-tighter mb-1">
              Potential
            </div>
            <div className="text-2xl font-bold font-mono text-accent-bright">{horse.potential}</div>
          </div>
          <div className="bg-black/40 border border-white/5 p-3 text-center min-w-[100px]">
            <div className="text-[9px] font-black uppercase text-foreground/20 tracking-tighter mb-1">
              Energy
            </div>
            <div
              className={cn(
                "text-2xl font-bold font-mono",
                horse.energy > 50 ? "text-success" : "text-warning",
              )}
            >
              {Math.round(horse.energy)}%
            </div>
          </div>
          <div className="bg-black/40 border border-white/5 p-3 text-center min-w-[100px]">
            <div className="text-[9px] font-black uppercase text-foreground/20 tracking-tighter mb-1">
              Fans
            </div>
            <div className="text-2xl font-bold font-mono text-blue-300/80 flex items-center justify-center gap-1">
              <Users className="h-4 w-4" />
              {formatFanCount(horse.fanCount ?? 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
