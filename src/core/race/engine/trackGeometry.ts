import type { CourseSpecification, TrackSection } from "@/data/tracks";

export function getTrackSection(
  pos: number,
  distance: number,
  course?: CourseSpecification,
): TrackSection | null {
  if (!course || !course.sections || course.sections.length === 0) return null;

  const circ = course.circumference;
  const startOffset = (circ - (distance % circ)) % circ;
  const trackPos = (startOffset + pos) % circ;

  let currentPos = 0;
  for (const section of course.sections) {
    if (trackPos >= currentPos && trackPos < currentPos + section.length) {
      return section;
    }
    currentPos += section.length;
  }
  return course.sections[0];
}

export function getSectionAndProgress(
  pos: number,
  distance: number,
  course?: CourseSpecification,
): { section: TrackSection | null; posWithinSection: number } {
  if (!course || !course.sections || course.sections.length === 0) {
    return { section: null, posWithinSection: 0 };
  }
  const circ = course.circumference;
  const startOffset = (circ - (distance % circ)) % circ;
  const trackPos = (startOffset + pos) % circ;
  let currentPos = 0;
  for (const section of course.sections) {
    if (trackPos >= currentPos && trackPos < currentPos + section.length) {
      return { section, posWithinSection: (trackPos - currentPos) / section.length };
    }
    currentPos += section.length;
  }
  return { section: course.sections[0], posWithinSection: 0 };
}

export function getSectionOrientation(
  section: TrackSection | null,
  posWithinSection: number,
): number | null {
  if (!section) return null;
  if (section.type === "straight" && section.orientationDeg !== undefined) {
    return section.orientationDeg;
  }
  if (
    section.type === "turn" &&
    section.entryOrientationDeg !== undefined &&
    section.exitOrientationDeg !== undefined
  ) {
    let diff = section.exitOrientationDeg - section.entryOrientationDeg;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return section.entryOrientationDeg + diff * posWithinSection;
  }
  return null;
}
