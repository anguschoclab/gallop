/**
 * person/application/renderPlan.ts - Memoized render-plan resolver
 *
 * Resolves a PersonIdentity + context + size + silk into a stable
 * PersonPortraitRenderPlan. Plans are memoized on a bounded LRU-style map so
 * large rosters re-render cheaply; no randomness occurs at render time.
 */

import type {
  PersonIdentity,
  PersonPortraitRenderPlan,
  PortraitContext,
} from "@/domains/person/model/types";

export type SilkInput = { primary: string; secondary: string; cap: string; pattern: string } | null;

const PLAN_CACHE = new Map<string, PersonPortraitRenderPlan>();
const MAX_PLANS = 500;

function silkKey(silk: SilkInput | undefined): string {
  if (!silk) return "-";
  return `${silk.primary},${silk.secondary},${silk.cap},${silk.pattern}`;
}

export interface ResolvePlanOptions {
  identity: PersonIdentity;
  context?: PortraitContext;
  width?: number;
  height?: number;
  silk?: SilkInput;
  label?: string;
}

export function resolvePersonRenderPlan(options: ResolvePlanOptions): PersonPortraitRenderPlan {
  const { identity } = options;
  const context = options.context ?? "owner-formal";
  const width = options.width ?? 100;
  const height = options.height ?? 120;
  const label = options.label ?? `${identity.biography.displayName} portrait`;
  const a = identity.appearance;
  const key = [
    identity.id,
    a.revision,
    a.schemaVersion,
    a.assetPackVersion,
    context,
    width,
    height,
    silkKey(options.silk),
    label,
  ].join("|");

  const cached = PLAN_CACHE.get(key);
  if (cached) return cached;

  const plan: PersonPortraitRenderPlan = {
    identity,
    context,
    width,
    height,
    silk: options.silk ?? null,
    label,
  };

  if (PLAN_CACHE.size >= MAX_PLANS) {
    const first = PLAN_CACHE.keys().next().value;
    if (first !== undefined) PLAN_CACHE.delete(first);
  }
  PLAN_CACHE.set(key, plan);
  return plan;
}

/** Test hook: current number of memoized plans (bounded by MAX_PLANS). */
export function personRenderPlanCacheSize(): number {
  return PLAN_CACHE.size;
}
