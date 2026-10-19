import type { PersonIdentity } from "@/domains/person/model/types";

export function createStubPersonIdentity(
  overrides: Partial<PersonIdentity["biography"]> & { id?: string } = {},
): PersonIdentity {
  const { id, ...biographyOverrides } = overrides;
  return {
    id: id ?? "stub-person",
    biography: {
      displayName: "Stub Person",
      birthYear: 1990,
      nationality: "USA",
      pronouns: "he/him",
      presentation: "masculine",
      ...biographyOverrides,
    },
    appearance: {
      schemaVersion: 1,
      assetPackVersion: 1,
      seed: 12345,
      revision: 0,
      faceBaseId: "oval",
      skinToneId: "#e0ac69",
      hairId: "short-crop",
      hairColorId: "#3b2410",
      eyeId: "almond",
      eyeColorId: "#2a4a7a",
      browId: "medium",
      noseId: "straight",
      mouthId: "neutral",
      earId: "medium",
      facialHairId: null,
      eyewearId: null,
      headwearId: null,
      bodyId: "medium",
      accessoryId: null,
      ageOverlayId: null,
    },
  };
}
