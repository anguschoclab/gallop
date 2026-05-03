import type { Horse } from "./types";

export type Runner = {
  horseId: string;
  name: string;
  silk: string;
  coatColor?: string; // For race viewer sprite selection
  owned: boolean;
  position: number; // meters traveled
  velocity: number;
  finishTime: number | null;
  // baked params
  topSpeed: number; // m/s
  accel: number;
  staminaFactor: number;
  noise: number;
};

export function buildRunner(h: Horse, owned: boolean): Runner {
  const formMod = 1 + h.form / 100;
  const energyMod = 0.8 + (h.energy / 100) * 0.2;
  // base m/s ~ 14-20 for 30..95 speed
  const topSpeed = (12 + (h.stats.speed / 100) * 10) * formMod * energyMod;
  const accel = 1.5 + (h.stats.acceleration / 100) * 3.5;
  const staminaFactor = 0.4 + (h.stats.stamina / 100) * 0.6; // 1 = no fade
  const noise = (110 - h.stats.consistency) / 100; // 0.1..1
  return {
    horseId: h.id,
    name: h.name,
    silk: h.silk,
    coatColor: h.coatColor,
    owned,
    position: 0,
    velocity: 0,
    finishTime: null,
    topSpeed,
    accel,
    staminaFactor,
    noise,
  };
}

export function stepRunner(r: Runner, dt: number, t: number, distance: number) {
  if (r.finishTime !== null) return;
  // stamina curve: full speed early, fade in last 30% based on stamina
  const progress = r.position / distance;
  let staminaMul = 1;
  if (progress > 0.6) {
    const fade = (progress - 0.6) / 0.4; // 0..1
    staminaMul = 1 - (1 - r.staminaFactor) * fade;
  }
  const targetSpeed = r.topSpeed * staminaMul * (1 + (Math.random() - 0.5) * 0.08 * r.noise);
  // accelerate toward target
  const diff = targetSpeed - r.velocity;
  r.velocity += Math.sign(diff) * Math.min(Math.abs(diff), r.accel * dt);
  r.position += r.velocity * dt;
  if (r.position >= distance) {
    r.position = distance;
    // interpolate finish time
    r.finishTime = t;
  }
}
