/**
 * insuranceFacade.ts — Service-layer re-exports for insurance domain.
 * Routes component imports away from direct @/core/insurance access.
 */

export { calculateDailyPremium } from "@/core/insurance/insuranceTypes";
