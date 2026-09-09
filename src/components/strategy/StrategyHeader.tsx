import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { calculateOverallRating } from "@/core/horse/stats";
import type { Horse, HorseCampaign } from "@/game/types";
import { Activity, ShieldAlert, Sparkles, Heart } from "lucide-react";
import { cn } from "@/lib/cn";

interface StrategyHeaderProps {
  horse: Horse;
  campaign?: HorseCampaign;
  onToggleAutoManaged: (autoManaged: boolean) => void;
}

export function StrategyHeader({ horse, campaign, onToggleAutoManaged }: StrategyHeaderProps) {
  const ovr = calculateOverallRating(horse);
  const autoManaged = campaign?.autoManaged ?? false;
  const healthStatus = horse.healthStatus ?? "healthy";
  const isHealthy = healthStatus === "healthy";

  return (
    <Card className="bg-slate-900/60 border-white/10 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-gold via-amber-500 to-gold/30" />
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Horse Identity & Core Vitals */}
          <div className="flex items-start md:items-center gap-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gold/20 via-slate-800 to-slate-900 border border-gold/30 flex items-center justify-center font-black text-2xl text-gold font-[family-name:var(--font-display)] shadow-lg">
                {horse.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-gold text-t950 font-mono font-black text-xs px-2 py-0.5 rounded shadow">
                OVR {ovr}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-black text-cream font-[family-name:var(--font-display)] tracking-tight">
                  {horse.name}
                </h1>
                <Badge
                  variant="outline"
                  className="text-xs uppercase border-gold/40 text-gold-bright font-mono"
                >
                  {horse.age}yo {horse.gender}
                </Badge>
                <Badge
                  variant={isHealthy ? "outline" : "destructive"}
                  className={cn(
                    "text-xs font-mono capitalize gap-1",
                    isHealthy && "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
                  )}
                >
                  {isHealthy ? (
                    <Activity className="w-3 h-3" />
                  ) : (
                    <ShieldAlert className="w-3 h-3" />
                  )}
                  {healthStatus}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-xs text-cream-muted font-mono">
                <div className="flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                  <span>
                    Energy: <span className="font-bold text-cream">{horse.energy}%</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Form:{" "}
                    <span
                      className={cn(
                        "font-bold",
                        (horse.form ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400",
                      )}
                    >
                      {horse.form > 0 ? `+${horse.form}` : horse.form}
                    </span>
                  </span>
                </div>
                <div>
                  Fame: <span className="font-bold text-cream">{horse.fame ?? 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Auto-Manage Control */}
          <div className="flex items-center gap-4 bg-slate-950/60 p-4 rounded-xl border border-white/5 md:self-center">
            <div className="space-y-0.5 text-right">
              <Label
                htmlFor="auto-manage-toggle"
                className="text-sm font-bold text-cream cursor-pointer"
              >
                Auto-Managed Campaign
              </Label>
              <p className="text-[11px] text-cream-muted">
                {autoManaged ? "AI handles race nominations & entries" : "Manual player entry only"}
              </p>
            </div>
            <Switch
              id="auto-manage-toggle"
              checked={autoManaged}
              onCheckedChange={onToggleAutoManaged}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
