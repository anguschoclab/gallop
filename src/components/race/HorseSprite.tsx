import { memo } from "react";
import type { CSSProperties } from "react";
import {
  getAnimationDuration,
  getSpriteSheet,
  getSpriteLoadStatus,
  getSpriteMetrics,
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

  if (spriteUrl && !spriteFailed) {
    // Metrics come from the sheet's measured natural size when available, so
    // sheets of any width/height/frame-count crop to the right frame.
    const metrics = getSpriteMetrics(spriteUrl, sheet);
    const animate = isAnimated && metrics.frames > 1;
    const vars = {
      "--sprite-frame-width": `${metrics.frameWidth}px`,
      "--sprite-sheet-width": `${animate ? metrics.sheetWidth : metrics.frameWidth}px`,
      "--sprite-sheet-height": `${metrics.frameHeight}px`,
    } as CSSProperties;

    if (animate) {
      return (
        <div
          className={`horse-sprite ${isRunning && !prefersReducedMotion ? "horse-sprite-animated" : ""}`}
          style={{
            ...vars,
            backgroundImage: `url(${spriteUrl})`,
            animationDuration: isRunning ? animationDuration : "0.6s",
            animationTimingFunction: `steps(${metrics.frames})`,
          }}
        />
      );
    }

    return (
      <div
        className={`horse-sprite horse-sprite-static ${isRunning && !prefersReducedMotion ? "horse-sprite-bob" : ""}`}
        style={{
          ...vars,
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
