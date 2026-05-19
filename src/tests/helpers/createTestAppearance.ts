import type { AppearanceDNA } from "@/core/genetics/types";

/**
 * Creates valid test appearance DNA.
 *
 * @param overrides - Optional appearance properties to override defaults
 * @returns Complete AppearanceDNA object
 */
export function createTestAppearance(overrides?: Partial<AppearanceDNA>): AppearanceDNA {
  return {
    seed: 12345,
    headTilt: 0,
    headLength: 1.0,
    earSpread: 1.0,
    eyeY: 0,
    forelockSweep: 0,
    maneWaves: [0, 0, 0, 0],
    bodyLength: 1.0,
    bodyDepth: 1.0,
    legLength: 1.0,
    tailSweep: 0,
    tailFullness: 1.0,
    socks: ["none", "none", "none", "none"],
    dapples: [],
    flecks: [],
    ...overrides,
  } as AppearanceDNA;
}
