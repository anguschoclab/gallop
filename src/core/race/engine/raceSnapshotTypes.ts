export interface HorseSnapshot {
  horseId: string;
  position: number;
  lane: number;
  velocity: number;
}

export interface RaceSnapshot {
  t: number;
  horses: HorseSnapshot[];
}

export interface RaceReplay {
  raceId: string;
  snapshots: RaceSnapshot[];
  distance: number;
  trackType?: "Turf" | "Dirt" | "Synthetic";
  trackHandedness?: "left" | "right" | "straight";
}
