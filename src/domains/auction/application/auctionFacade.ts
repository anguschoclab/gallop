/**
 * auctionFacade.ts — Service-layer facade for auction domain.
 * Per PR 9 of the megaplan.
 */

export * from "@/domains/auction/simulation/data";
export * from "@/domains/auction/simulation/engine";
export * from "@/domains/auction/simulation/runner";
export * from "@/domains/auction/simulation/biddingHistory";
export * from "@/domains/auction/simulation/auctionValuation";
export * from "@/domains/auction/simulation/auctionConsignment";
export * from "@/domains/auction/simulation/auctionResolution";
export * from "@/domains/auction/model/auctionRunnerTypes";
export * from "@/domains/auction/simulation/auctionRunnerImpacts";
export * from "@/domains/auction/simulation/auctionImpactActions";
export * from "@/domains/auction/simulation/claimingResolutionService";
