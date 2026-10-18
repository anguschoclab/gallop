/**
 * inboxFacade.ts — Service-layer re-exports for inbox domain.
 * Routes component imports away from direct @/core/inbox access.
 */

export { interpolateCtaRoute } from "@/domains/inbox/model/ctaRoute";
export type { InboxCategory, InboxMessage, InboxPriority } from "@/domains/inbox/model/inboxTypes";
