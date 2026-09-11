/**
 * nextActionService.ts - Service facade for dashboard next-action types
 *
 * Components must not import from @/core directly. This service re-exports
 * the next-action types so components can consume them without a layering
 * violation.
 */

export type { NextAction, NextActionKind, NextActionInput } from "@/core/dashboard/nextAction";
