import { Link, useNavigate } from "@tanstack/react-router";
import type { FileRouteTypes } from "@/routeTree.gen";
import { ChevronRight, GraduationCap, X } from "lucide-react";
import { useCallback } from "react";
import type { NextAction } from "@/core/dashboard/nextAction";
import { useGame } from "@/game/store";
import { deriveTutorialStep, tutorialStepToAction } from "@/core/tutorial/deriveTutorialStep";
import { NextActionBanner } from "@/components/dashboard/NextActionBanner";
import { trackEvent } from "@/core/analytics/tracker";

export interface TutorialNextActionBannerProps {
  fallbackAction: NextAction;
}

export function TutorialNextActionBanner({ fallbackAction }: TutorialNextActionBannerProps) {
  const tutorial = useGame((s) => s.tutorial);
  const completeTutorialBeat = useGame((s) => s.completeTutorialBeat);
  const skipTutorial = useGame((s) => s.skipTutorial);
  const navigate = useNavigate();

  const step = tutorial ? deriveTutorialStep({ tutorial }) : null;
  const action = step ? tutorialStepToAction(step) : null;

  const handleSkip = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      e.preventDefault();
      if (step) {
        trackEvent("tutorial_skip", { beat: step.beat });
        skipTutorial();
      }
    },
    [step, skipTutorial],
  );

  const handleClick = useCallback(() => {
    if (step && action) {
      trackEvent("tutorial_beat_click", { beat: step.beat });
      navigate({
        to: action.to as FileRouteTypes["to"],
        params: action.params as Record<string, string>,
      });
    }
  }, [step, action, navigate]);

  if (!step || !action) {
    return <NextActionBanner action={fallbackAction} />;
  }

  return (
    <section
      role="region"
      aria-label="Tutorial next action"
      className="group relative flex items-center gap-4 rounded-lg border border-blue-400/30 bg-gradient-to-r from-blue-400/10 via-blue-400/5 to-transparent px-5 py-4 shadow-[0_0_24px_rgba(96,165,250,0.08)] transition hover:border-blue-400/60"
    >
      <Link
        to={action.to as FileRouteTypes["to"]}
        params={action.params as Record<string, string>}
        aria-label={`${action.label}: ${action.detail}`}
        onClick={handleClick}
        className="flex flex-1 items-center gap-4 min-w-0"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-blue-400/15 text-blue-400">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0" aria-live="polite">
          <p className="text-[10px] font-black uppercase tracking-wide text-blue-400/80 font-[family-name=var(--font-mono)]">
            Tutorial · Step {step.beat + 1} of 5
          </p>
          <p className="text-lg font-bold text-cream font-[family-name=var(--font-display)] truncate">
            {action.label}
          </p>
          <p className="text-xs text-cream-muted font-[family-name=var(--font-body)] truncate">
            {action.detail}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-blue-400/60 transition group-hover:translate-x-0.5 group-hover:text-blue-400" />
      </Link>

      <button
        type="button"
        aria-label="Skip tutorial"
        onClick={handleSkip}
        className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-cream-muted transition hover:text-cream hover:bg-blue-400/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400"
      >
        <X className="h-4 w-4" />
      </button>
    </section>
  );
}
