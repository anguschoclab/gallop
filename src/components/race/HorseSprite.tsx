import { memo } from "react";
import {
  getAnimationDuration,
  getSpriteSheet,
  getSpriteLoadStatus,
} from "@/components/race/raceVisualHelpers";

interface HorseSpriteProps {
  coatColor?: string;
  silk: string;
  velocity: number;
  finishTime: number | null;
  horseName: string;
  isRunning: boolean;
  spriteUrl?: string;
  isAnimated: boolean;
}

const prefersReducedMotion =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function HorseSpriteComponent({
  coatColor,
  silk,
  velocity,
  horseName,
  isRunning,
  spriteUrl,
  isAnimated,
}: HorseSpriteProps) {
  const quantizedVelocity = Math.round(velocity);
  const animationDuration = getAnimationDuration(quantizedVelocity);
  const sheet = getSpriteSheet(coatColor);
  const loadStatus = spriteUrl ? getSpriteLoadStatus(spriteUrl) : undefined;
  const spriteFailed = loadStatus === "error";

  if (isAnimated && spriteUrl && !spriteFailed) {
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

  if (spriteUrl && !spriteFailed) {
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
      className="h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-dashed border-amber-400 shadow"
      style={{
        backgroundColor: silk,
        animation:
          isRunning && !prefersReducedMotion ? "pulse 0.5s ease-in-out infinite" : undefined,
      }}
    >
      {horseName.slice(0, 2).toUpperCase()}
    </div>
  );
}

export const HorseSprite = memo(HorseSpriteComponent);
