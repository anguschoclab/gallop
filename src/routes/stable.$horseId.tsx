import { createFileRoute, Link, useRouter, notFound } from "@tanstack/react-router";
import { type ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HorseAwardsPanel } from "@/components/awards";
import { FounderLegacy } from "@/components/horse/FounderLegacy";
import { TrainingPanel } from "@/components/horse/TrainingPanel";
import { PrivateTrialDialog } from "@/components/horse/PrivateTrialDialog";
import { SyndicateDialog } from "@/components/market/SyndicateDialog";
import { HorseDetailHeader } from "@/components/horse/HorseDetailHeader";
import { HorseIdentitySection } from "@/components/horse/HorseIdentitySection";
import { HorseConditionSection } from "@/components/horse/HorseConditionSection";
import { HorseAnalyticsSection } from "@/components/horse/HorseAnalyticsSection";
import { HorseManagementSection } from "@/components/horse/HorseManagementSection";
import { HorseLineageSection } from "@/components/horse/HorseLineageSection";
import { HorseRaceHistorySection } from "@/components/horse/HorseRaceHistorySection";
import { calculateOverallRating } from "@/core/horse/stats";
import { useHorseActions } from "@/hooks/useHorseActions";
import { useHorseDetail } from "@/hooks/useHorseDetail";
import {
  ArrowLeft,
  Zap,
  FileText,
  Activity,
  TrendingUp,
  GitBranch,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stable/$horseId")({
  component: HorseDetail,
  notFoundComponent: () => (
    <div className="p-12 text-center space-y-4">
      <h1 className="text-4xl font-black font-[family-name:var(--font-display)] text-cream">
        Horse not found
      </h1>
      <Link
        to="/stable"
        className="text-gold uppercase font-mono text-xs tracking-widest hover:underline"
      >
        Back to Stable
      </Link>
    </div>
  ),
});

function HorseDetail() {
  const { horseId } = Route.useParams();
  const router = useRouter();
  const {
    horse,
    isConsigned,
    canRetireToStud,
    consignedSale,
    eligibleSale,
    day,
  } = useHorseActions(horseId);

  const detail = useHorseDetail(horseId);

  if (!horse) throw notFound();

  const ovr = calculateOverallRating(horse);
  const { peakingMultiplier, peakingStatus, g1Wins } = detail;
  const isG1Winner = g1Wins > 0;

  const iconMap: Record<string, ComponentType<{ className?: string }>> = {
    stats: FileText,
    health: Activity,
    training: Zap,
    beyer: TrendingUp,
    lineage: GitBranch,
    history: History,
  };

  return (
    <div className="flex gap-8 relative pb-20 animate-fade-in">
      {/* Sticky Navigation Sidebar */}
      <aside className="hidden xl:block w-48 shrink-0">
        <div className="sticky top-6 space-y-6">
          <button
            onClick={() => router.navigate({ to: "/stable" })}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cream/30 hover:text-gold transition-colors mb-8"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Stable
          </button>

          <nav className="space-y-1">
            {detail.sections.map((s) => {
              const Icon = iconMap[s.id];
              return (
                <button
                  key={s.id}
                  data-section-id={s.id}
                  onClick={detail.handleScrollToSection}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest border-l-2 transition-all",
                    detail.activeSection === s.id
                      ? "border-gold text-gold bg-gold/5"
                      : "border-transparent text-cream/20 hover:text-cream/60 hover:bg-white/[0.02]",
                  )}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {s.label}
                </button>
              );
            })}
          </nav>

          <div className="pt-6 border-t border-white/5 space-y-4">
            <div className="text-[9px] font-black uppercase tracking-tighter text-gold/40 px-3">
              Actions
            </div>
            <div className="px-3 space-y-2">
              {isG1Winner && horse.stud?.atStud && !detail.isSyndicated && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-[9px] font-black uppercase border-gold/20 hover:bg-gold/10 text-gold"
                  onClick={() => detail.setSyndicateDialogOpen(true)}
                >
                  Syndicate
                </Button>
              )}
              {canRetireToStud && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-[9px] font-black uppercase border-gold/20 hover:bg-gold/10 text-gold-bright"
                  onClick={() => {
                    if (confirm(`Retire ${horse.name} to stud? This cannot be undone.`)) {
                      detail.retireToStud(horse.id);
                    }
                  }}
                >
                  Retire to Stud
                </Button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Record Area */}
      <div className="flex-1 space-y-12">
        <HorseDetailHeader horse={horse} ovr={ovr} />

        {/* Pillar Layout: Physical vs Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT PILLAR */}
          <div className="lg:col-span-5 space-y-8">
            <HorseIdentitySection horse={horse} peakingStatus={peakingStatus} />
            <HorseConditionSection horse={horse} />
            <HorseManagementSection
              horse={horse}
              isConsigned={isConsigned}
              consignedSale={consignedSale}
              eligibleSale={eligibleSale}
              day={day}
            />
          </div>

          {/* RIGHT PILLAR */}
          <div className="lg:col-span-7 space-y-8">
            <section id="training" className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-gold" />
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-cream">
                  Training
                </h2>
              </div>
              <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-gold">
                <CardHeader className="pb-2 border-b border-white/5">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-cream/40">
                      Training Schedule
                    </CardTitle>
                    <span className="text-[10px] font-mono text-gold-bright font-black uppercase">
                      {detail.slotsLeft} slots left
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <TrainingPanel
                    horse={horse}
                    isPregnant={detail.isPregnant}
                    slotsLeft={detail.slotsLeft}
                    cash={detail.cash}
                    facilities={detail.facilities}
                    onTrain={detail.handleTrain}
                  />
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <PrivateTrialDialog horse={horse} horses={detail.horses} cash={detail.cash} />
                  </div>
                </CardContent>
              </Card>
            </section>

            <HorseAnalyticsSection horse={horse} peakingMultiplier={peakingMultiplier} />

            <HorseLineageSection
              horse={horse}
              horseId={horseId}
              progenyPregnancies={detail.progenyPregnancies}
              reBreedingPregnancies={detail.reBreedingPregnancies}
              localHorseMap={detail.localHorseMap}
            />

            <HorseRaceHistorySection
              horse={horse}
              raceHistoryLimit={detail.raceHistoryLimit}
              onLimitChange={detail.setRaceHistoryLimit}
            />

            <FounderLegacy horseId={horse.id} />
            <HorseAwardsPanel horse={horse} />
          </div>
        </div>
      </div>

      <SyndicateDialog
        isOpen={detail.syndicateDialogOpen}
        onClose={() => detail.setSyndicateDialogOpen(false)}
        stallionId={horse.id}
        stallionName={horse.name}
      />
    </div>
  );
}
