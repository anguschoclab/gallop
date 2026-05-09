/**
 * transportation/index.ts - Transportation module
 *
 * This module provides travel costs and logistics functionality.
 *
 * Dependencies: ./transportationTypes (types and functions)
 * Related files: transportationTypes.ts (provides types and functions)
 */

// Transportation Module - Travel costs and logistics

export type {
  TransportMode,
  TransportStatus,
  TransportRequest,
  TransportConfig,
} from "./transportationTypes";

export {
  TRANSPORT_CONFIGS,
  calculateTransportCost,
  calculateTransportDuration,
  getTransportModeForDistance,
  createTransportRequest,
  formatTransportMode,
} from "./transportationTypes";
