import type { CourseSpecification, TrackSection } from "@/data/tracks";
import type { Runner } from "./runnerBuilder";
import { getSectionOrientation } from "./trackGeometry";
import {
  WIND_EFFECT_SCALE,
  SPRINTER_WIND_MULTIPLIER,
  MIN_WIND_SPEED_MOD,
  MAX_WIND_SPEED_MOD,
  HEADWIND_STAMINA_PENALTY,
  TAILWIND_STAMINA_RELIEF,
  LONG_STRAIGHT_THRESHOLD,
} from "@/constants/raceEngineConstants";

export function calculateWindEffect(
  r: Runner,
  course: CourseSpecification | undefined,
  windKph: number | undefined,
  windDirectionDeg: number | undefined,
  section: TrackSection | null,
  posWithinSection: number,
): { speedMod: number; staminaMod: number } {
  if (typeof windKph !== "number" || typeof windDirectionDeg !== "number" || !section) {
    return { speedMod: 1, staminaMod: 1 };
  }

  const sectionOrientation = getSectionOrientation(section, posWithinSection);
  if (sectionOrientation === null) {
    return { speedMod: 1, staminaMod: 1 };
  }

  const windComponent = Math.cos(((sectionOrientation - windDirectionDeg) * Math.PI) / 180);

  const baseEffect = windKph / WIND_EFFECT_SCALE;

  const isSprinter = r.topSpeed > 18;
  const isLongStraight =
    section.type === "straight" && (course?.straightLength ?? 0) > LONG_STRAIGHT_THRESHOLD;
  const sprinterMul = isSprinter && isLongStraight ? SPRINTER_WIND_MULTIPLIER : 1.0;

  let speedMod = 1 - baseEffect * windComponent * sprinterMul;
  speedMod = Math.max(MIN_WIND_SPEED_MOD, Math.min(MAX_WIND_SPEED_MOD, speedMod));

  let staminaMod = 1;
  if (windComponent > 0.3) {
    staminaMod = HEADWIND_STAMINA_PENALTY;
  } else if (windComponent < -0.3) {
    staminaMod = TAILWIND_STAMINA_RELIEF;
  }

  return { speedMod, staminaMod };
}
