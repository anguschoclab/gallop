import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AwardIcon } from "./AwardIcon";
import { AwardBadge } from "./AwardBadge";
import { cn } from "@/lib/cn";
import { Link } from "@tanstack/react-router";
import type { AwardRegion, RegionalAward } from "@/core/awards/types";
import {
  REGION_AWARD_NAMES,
  REGION_DISPLAY_NAMES,
  CATEGORY_DISPLAY_NAMES,
  CATEGORY_DESCRIPTIONS,
} from "@/core/awards/types";
import { REGION_COLORS } from "@/assets/awards";
import { Trophy, ChevronRight, Star, Sparkles } from "lucide-react";

interface AwardCeremonyProps {
  isOpen: boolean;
  onClose: () => void;
  ceremonies: { region: AwardRegion; year: number; awards: RegionalAward[] }[];
  onComplete?: () => void;
}

export function AwardCeremony({ isOpen, onClose, ceremonies, onComplete }: AwardCeremonyProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  if (ceremonies.length === 0) {
    return null;
  }

  const currentCeremony = ceremonies[currentIndex];
  const region = currentCeremony.region;
  const awards = currentCeremony.awards;
  const year = currentCeremony.year;

  const isLast = currentIndex === ceremonies.length - 1;
  const regionName = REGION_AWARD_NAMES[region];
  const regionDisplay = REGION_DISPLAY_NAMES[region];
  const colors = REGION_COLORS[region];

  const playerAwards = awards.filter((a) => !a.stableId);
  const hasPlayerWins = playerAwards.length > 0;

  useEffect(() => {
    if (hasPlayerWins) {
      setShowConfetti(true);
    }
  }, [currentIndex, hasPlayerWins]);

  const handleNext = () => {
    if (isLast) {
      setShowConfetti(false);
      onComplete?.();
      onClose();
    } else {
      setCurrentIndex(currentIndex + 1);
      setShowConfetti(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn("bg-gradient-to-b from-card to-muted", "border-2")}
        style={{ borderColor: colors.accent }}
      >
        <Confetti active={showConfetti} />
        <DialogHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-6 h-6" style={{ color: colors.accent }} />
            <DialogTitle className="text-2xl font-bold" style={{ color: colors.accent }}>
              {regionName}
            </DialogTitle>
          </div>
          <p className="text-muted-foreground">
            {regionDisplay} • Year {year}
          </p>
          <div className="flex items-center justify-center gap-1 mt-2">
            {ceremonies.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  idx === currentIndex ? "bg-primary" : "bg-muted-foreground/30",
                )}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Player wins highlight */}
          {hasPlayerWins && (
            <div
              className="rounded-lg p-4 text-center"
              style={{ backgroundColor: `${colors.bg}20` }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-5 h-5" style={{ color: colors.accent }} />
                <span className="font-semibold" style={{ color: colors.accent }}>
                  Congratulations
                </span>
                <Sparkles className="w-5 h-5" style={{ color: colors.accent }} />
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Your stable won {playerAwards.length} award{playerAwards.length > 1 ? "s" : ""}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {playerAwards.map((award) => (
                  <Badge
                    key={award.id}
                    variant="outline"
                    className="flex items-center gap-1 px-2 py-1"
                  >
                    <AwardIcon region={award.region} category={award.category} size="tiny" />
                    <span className="text-xs">{CATEGORY_DISPLAY_NAMES[award.category]}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* All awards list */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Award Winners
            </h3>
            <div className="grid gap-2 max-h-[300px] overflow-y-auto">
              {awards.map((award) => (
                <Link
                  key={award.id}
                  to="/awards/$category"
                  params={{ category: award.category }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border",
                    !award.stableId && "bg-primary/5 border-primary/20",
                    "hover:bg-accent/50 transition-colors",
                  )}
                >
                  <AwardIcon
                    region={award.region}
                    category={award.category}
                    size="small"
                    animated={award.isHistoric}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {CATEGORY_DISPLAY_NAMES[award.category]}
                      </span>
                      {!award.stableId && (
                        <Badge variant="default" className="text-[10px]">
                          Your Horse
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {CATEGORY_DESCRIPTIONS[award.category]}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="truncate">{award.horseName}</span>
                      <span>•</span>
                      <span className="text-gold font-semibold">{award.points} pts</span>
                    </div>
                  </div>
                  {award.isHistoric && <Star className="w-4 h-4 text-fame fill-fame" />}
                </Link>
              ))}
            </div>
          </div>

          {/* Runner-ups section */}
          {awards.some((a) => a.runnerUpId) && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Close Contenders
              </h3>
              <div className="text-sm text-muted-foreground">
                {awards
                  .filter((a) => a.runnerUpId)
                  .map((a) => `${CATEGORY_DISPLAY_NAMES[a.category]}: ${a.margin} point margin`)
                  .join(" • ")}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Ceremony {currentIndex + 1} of {ceremonies.length}
          </div>
          <Button onClick={handleNext} className="gap-2">
            {isLast ? "Close results" : "Next ceremony"}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Simple confetti effect component
function Confetti({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div
      data-testid="confetti-overlay"
      className="absolute inset-0 pointer-events-none overflow-hidden"
    >
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full animate-ping"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            backgroundColor: [
              "var(--color-chart-3)",
              "var(--color-chart-4)",
              "var(--color-chart-1)",
            ][Math.floor(Math.random() * 3)],
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}
    </div>
  );
}

// Hook for managing ceremony state
export function useAwardCeremony() {
  const [isOpen, setIsOpen] = useState(false);
  const [ceremonies, setCeremonies] = useState<
    { region: AwardRegion; year: number; awards: RegionalAward[] }[]
  >([]);

  const openCeremony = (
    newCeremonies: { region: AwardRegion; year: number; awards: RegionalAward[] }[],
  ) => {
    setCeremonies(newCeremonies);
    setIsOpen(true);
  };

  const closeCeremony = () => {
    setIsOpen(false);
    setCeremonies([]);
  };

  return {
    isOpen,
    ceremonies,
    openCeremony,
    closeCeremony,
  };
}
