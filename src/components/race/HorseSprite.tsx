import { getAnimationDuration, getSpriteSheet } from "@/components/race/raceVisualHelpers";
import type { Runner } from "@/core/race/engine/runnerBuilder";

interface HorseSpriteProps {
  runner: Runner;
  isRunning: boolean;
  spriteUrl?: string;
  isAnimated: boolean;
}

export function HorseSprite({ runner, isRunning, spriteUrl, isAnimated }: HorseSpriteProps) {
  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const animationDuration = getAnimationDuration(runner.velocity);
  const sheet = getSpriteSheet(runner.coatColor);

  if (isAnimated && spriteUrl) {
    const sheetWidth = (sheet?.frames ?? 6) * (sheet?.frameWidth ?? 50);
    return (
      <div
        className={`horse-sprite ${isRunning && !prefersReducedMotion ? "horse-sprite-animated" : ""}`}
        style={{
          backgroundImage: `url(${spriteUrl})`,
          backgroundSize: `${sheetWidth}px ${sheet?.frameHeight ?? 100}px`,
          animationDuration: isRunning ? animationDuration : "0.6s",
        }}
      />
    );
  }

  if (spriteUrl) {
    return (
      <div
        className={`horse-sprite horse-sprite-static ${isRunning && !prefersReducedMotion ? "horse-sprite-bob" : ""}`}
        style={{
          backgroundImage: `url(${spriteUrl})`,
        }}
      />
    );
  }

  return (
    <div
      className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow"
      style={{
        backgroundColor: runner.silk,
        animation:
          isRunning && !prefersReducedMotion ? "pulse 0.5s ease-in-out infinite" : undefined,
      }}
    />
  );
}
