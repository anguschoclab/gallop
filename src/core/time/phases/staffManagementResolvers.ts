/**
 * staffManagementResolvers.ts - Staff management intent resolution
 */

import type { PipelineContext } from "../pipeline";
import type { AnyIntent, StaffIntent } from "@/core/resolver/intents";
import type { AnyImpact, StaffImpact } from "@/core/resolver/impacts/index";
import type { StableId } from "@/core/types/branded";
import { generateUUID } from "@/core/uuid";

export function resolveStaffIntent(
  intent: AnyIntent,
  context: PipelineContext,
  impacts: AnyImpact[],
): boolean {
  if (intent.type !== "staff") return false;

  const typedIntent = intent as StaffIntent;
  impacts.push({
    id: generateUUID(context.dailyRng),
    intentId: intent.id,
    day: context.newDay,
    phase: "managementResolution",
    logLevel: "always",
    type: "staff",
    action: typedIntent.action,
    staffId: typedIntent.staffId,
    stableId: typedIntent.stableId as StableId,
    role: typedIntent.role,
    tier: typedIntent.tier,
    salary: typedIntent.salary,
    reason: `${typedIntent.action === "hire" ? "Hired" : "Released"} ${typedIntent.role}`,
  } as StaffImpact);

  return true;
}
