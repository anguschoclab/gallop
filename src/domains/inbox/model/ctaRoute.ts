/**
 * core/inbox/ctaRoute.ts - CTA route parameter interpolation utility
 *
 * Replaces $paramName placeholders in a CTA route string with values
 * from the provided params map. Used by both InboxPage and UrgentMessagesStrip.
 */

export function interpolateCtaRoute(route: string, params?: Record<string, string>): string {
  return route.replace(/\$(\w+)/g, (_, key: string) => params?.[key] || "");
}
