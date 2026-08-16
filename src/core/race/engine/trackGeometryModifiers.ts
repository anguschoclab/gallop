import type { CourseSpecification } from "@/data/tracks";
import type { Runner } from "./runnerBuilder";
import { getTrackSection } from "./trackGeometry";
import {
  AGILITY_MITIGATION_FACTOR,
  POSITIONING_SKILL_FACTOR,
  BULLRING_TRAIT_BONUS,
  MAX_TURN_PENALTY,
  SURFACE_SPECIALIST_SPEED_BONUS,
} from "@/constants/raceEngineConstants";

export function calculateTrackGeometryModifiers(
  r: Runner,
  position: number,
  distance: number,
  course?: CourseSpecification,
): {
  turnSpeedMul: number;
  gradientSpeedMul: number;
  gradientStaminaMul: number;
  arcFactor: number;
  radius: number;
  traitSurfaceMul: number;
} {
  const section = getTrackSection(position, distance, course);
  const radius = section?.type === "turn" ? (section.radius ?? Infinity) : Infinity;
  const gradient = section?.gradient ?? 0;
  const arcFactor = radius === Infinity ? 1 : 1 + r.lane / radius;

  const gradientSpeedMul = 1 - gradient / 100;
  const isHillSpecialist = r.jockey?.traits.includes("hill_specialist");
  const climbingApt = r.horse?.climbingAptitude ?? 1.0;

  let gradientStaminaMul = gradient > 0 ? 1 - gradient / (200 * climbingApt) : 1;
  if (gradient > 0 && isHillSpecialist) {
    gradientStaminaMul = 1 - gradient / (400 * climbingApt);
  }

  let turnSpeedMul = 1.0;
  if (radius !== Infinity) {
    const centrifugalPressure = (r.velocity * r.velocity) / (radius * 10);
    const agilityMitigation = (r.horse.stats.acceleration / 100) * AGILITY_MITIGATION_FACTOR;
    const corneringApt = r.horse?.corneringAptitude ?? 1.0;
    const isBullringExpert = r.jockey?.traits.includes("bullring_expert");
    const positioningSkill = (r.jockey?.stats.positioning ?? 50) * POSITIONING_SKILL_FACTOR;
    const traitBonus = isBullringExpert ? BULLRING_TRAIT_BONUS : 0;

    const totalPenalty = Math.min(
      MAX_TURN_PENALTY,
      Math.max(
        0,
        centrifugalPressure - agilityMitigation * corneringApt - positioningSkill - traitBonus,
      ),
    );
    turnSpeedMul = 1 - totalPenalty;
  }

  let traitSurfaceMul = 1.0;
  const surface = course?.surface;
  if (surface === "Turf" && r.jockey?.traits.includes("turf_specialist")) {
    traitSurfaceMul = 1 + SURFACE_SPECIALIST_SPEED_BONUS;
  } else if (surface === "Dirt" && r.jockey?.traits.includes("dirt_specialist")) {
    traitSurfaceMul = 1 + SURFACE_SPECIALIST_SPEED_BONUS;
  }

  return { turnSpeedMul, gradientSpeedMul, gradientStaminaMul, arcFactor, radius, traitSurfaceMul };
}
