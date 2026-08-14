import type { Jockey, JockeyTrait } from "./types";

export const TRAIT_XP_UNLOCK_THRESHOLD = 100;
export const TRAIT_XP_MAINTENANCE_THRESHOLD = 50;
export const TRAIT_XP_TRAINING_CAP = 500;

export function awardTraitXp(jockey: Jockey, traitKey: JockeyTrait, amount: number): Jockey {
  const progression = jockey.traitProgression ?? { xp: {}, unlockedAt: {} };
  const currentXp = progression.xp[traitKey] ?? 0;
  return {
    ...jockey,
    traitProgression: {
      ...progression,
      xp: { ...progression.xp, [traitKey]: currentXp + amount },
    },
  };
}

export function checkTraitUnlock(jockey: Jockey, currentDay: number): Jockey {
  if (!jockey.traitProgression) return jockey;

  const { xp, unlockedAt } = jockey.traitProgression;
  const currentTraits = [...jockey.traits];

  for (const [traitKey, traitXp] of Object.entries(xp) as [JockeyTrait, number][]) {
    if (
      traitXp !== undefined &&
      traitXp >= TRAIT_XP_UNLOCK_THRESHOLD &&
      !currentTraits.includes(traitKey as JockeyTrait)
    ) {
      currentTraits.push(traitKey as JockeyTrait);
    }
  }

  const newUnlockedAt = { ...unlockedAt };
  for (const trait of currentTraits) {
    if (
      !newUnlockedAt[trait] &&
      xp[trait] !== undefined &&
      xp[trait] >= TRAIT_XP_UNLOCK_THRESHOLD
    ) {
      newUnlockedAt[trait] = currentDay;
    }
  }

  return {
    ...jockey,
    traits: currentTraits,
    traitProgression: { xp: { ...xp }, unlockedAt: newUnlockedAt },
  };
}

export function checkTraitAtrophy(jockey: Jockey): Jockey {
  if (!jockey.traitProgression) return jockey;

  const { xp } = jockey.traitProgression;
  const currentTraits = jockey.traits.filter((trait) => {
    const traitXp = xp[trait] ?? 0;
    return traitXp >= TRAIT_XP_MAINTENANCE_THRESHOLD;
  });

  return {
    ...jockey,
    traits: currentTraits,
  };
}

export function trainTrait(jockey: Jockey, traitKey: JockeyTrait, amount: number): Jockey {
  const progression = jockey.traitProgression ?? { xp: {}, unlockedAt: {} };
  const currentXp = progression.xp[traitKey] ?? 0;
  const newXp = Math.min(currentXp + amount, TRAIT_XP_TRAINING_CAP);
  return {
    ...jockey,
    traitProgression: {
      ...progression,
      xp: { ...progression.xp, [traitKey]: newXp },
    },
  };
}
