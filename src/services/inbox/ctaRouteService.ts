/**
 * ctaRouteService.ts - Service facade for inbox CTA route interpolation
 *
 * Components must not import from @/core directly. This service re-exports
 * the CTA route interpolation utility so components can consume it without
 * a layering violation.
 */

export { interpolateCtaRoute } from "@/core/inbox/ctaRoute";
