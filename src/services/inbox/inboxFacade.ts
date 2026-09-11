/**
 * inboxFacade.ts — Service-layer re-exports for inbox domain.
 * Routes component imports away from direct @/core/inbox access.
 */

export { interpolateCtaRoute } from "@/core/inbox/ctaRoute";
export type { InboxPriority } from "@/core/inbox/inboxTypes";
