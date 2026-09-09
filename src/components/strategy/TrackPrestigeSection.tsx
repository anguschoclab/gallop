import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  calculateAverageCampaignPrestige,
  calculateVenuePrestige,
  getPrestigeTier,
  getPrestigeTierBadgeClass,
} from "@/core/prestige/strategyPrestigeHelpers";
import { racecoursePrestigeMultiplier } from "@/core/prestige/racecoursePrestige";
import { getTrackById } from "@/data/tracks";
import type { CampaignRaceSlot, Race } from "@/game/types";
import { Building2, Award, TrendingUp, Landmark } from "lucide-react";

interface TrackPrestigeSectionProps {
  slots: CampaignRaceSlot[];
  getRace: (raceId: string) => Race | undefined;
}

export function TrackPrestigeSection({ slots, getRace }: TrackPrestigeSectionProps) {
  const avgPrestige = calculateAverageCampaignPrestige(slots, getRace);
  const tier = getPrestigeTier(avgPrestige);
  const tierBadgeClass = getPrestigeTierBadgeClass(tier);
  const fameMultiplier = (1 + (avgPrestige / 100) * 0.2).toFixed(2);

  // Collect unique tracks from planned slots
  const trackEntries = slots
    .map((s) => (s.raceId ? getRace(s.raceId) : undefined))
    .filter((r): r is Race => !!r)
    .reduce((acc, r) => {
      const resolvedTrackName = r.trackId ? getTrackById(r.trackId)?.name : undefined;
      const trackName: string = r.graded?.track || resolvedTrackName || "Unknown Track";
      if (!acc.has(trackName)) {
        const score = calculateVenuePrestige(trackName, r.trackId);
        acc.set(trackName, {
          name: trackName,
          score,
          tier: getPrestigeTier(score),
          multiplier: racecoursePrestigeMultiplier(r.trackId, trackName),
        });
      }
      return acc;
    }, new Map<string, { name: string; score: number; tier: any; multiplier: number }>());

  const campaignTracks = Array.from(trackEntries.values());

  return (
    <Card className="bg-slate-900/50 border-white/10 shadow-xl border-l-4 border-l-purple-500">
      <CardHeader className="border-b border-white/5 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-purple-400" />
            <CardTitle className="text-lg font-black tracking-wide text-cream font-[family-name:var(--font-display)]">
              Track Prestige Intelligence
            </CardTitle>
          </div>
          <Badge className={`${tierBadgeClass} font-mono text-xs uppercase px-2.5 py-0.5`}>
            {tier} Circuit
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Prestige Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/50 border border-white/5 space-y-1">
            <span className="text-xs text-cream-muted uppercase font-mono tracking-wider">
              Average Campaign Prestige
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-cream font-mono">{avgPrestige}</span>
              <span className="text-xs text-cream-muted font-mono">/ 100</span>
            </div>
            <p className="text-[11px] text-cream-muted">
              Higher venue prestige scales national prominence.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/50 border border-white/5 space-y-1">
            <span className="text-xs text-cream-muted uppercase font-mono tracking-wider">
              Fame & Valuation Boost
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-purple-400 font-mono">×{fameMultiplier}</span>
              <span className="text-xs text-emerald-400 font-mono flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> +{Math.round((avgPrestige / 100) * 20)}%
              </span>
            </div>
            <p className="text-[11px] text-cream-muted">
              Prestige multiplier applied to career reputation.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/50 border border-white/5 space-y-1">
            <span className="text-xs text-cream-muted uppercase font-mono tracking-wider">
              Venues Represented
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-gold font-mono">{campaignTracks.length || 0}</span>
              <span className="text-xs text-cream-muted font-mono">tracks planned</span>
            </div>
            <p className="text-[11px] text-cream-muted">
              Diverse track exposure sharpens adaptability.
            </p>
          </div>
        </div>

        {/* Track Venue List */}
        {campaignTracks.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-mono font-bold uppercase text-cream-muted tracking-wider">
              Planned Racecourse Venues
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {campaignTracks.map((t) => (
                <div
                  key={t.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-white/5"
                >
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-purple-400/80" />
                    <div>
                      <div className="text-sm font-bold text-cream">{t.name}</div>
                      <div className="text-[10px] text-cream-muted font-mono">
                        Multiplier: ×{t.multiplier.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className={`${getPrestigeTierBadgeClass(t.tier)} font-mono text-xs`}>
                    {t.score} pts
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
