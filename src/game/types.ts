export * from "@/core/common/types";
export * from "@/core/genetics/types";
export * from "@/core/horse/types";
export * from "@/core/jockey/types";
export * from "@/core/race/types";
export * from "@/core/stable/types";
export * from "@/core/market/types";
export * from "@/core/breeding/types";
export * from "@/core/campaign/types";

// Re-export specific external dependencies
export type { GameState } from "./state";
export type { RegionalAward, AwardRegion } from "./awards/types";
