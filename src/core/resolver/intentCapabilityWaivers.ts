import type { AnyIntent } from "./intents";

export type IntentCapabilityClass =
  | "shared_action"
  | "player_expression"
  | "system_lifecycle"
  | "npc_world_behavior"
  | "internal_infrastructure";

export interface IntentCapabilityWaiver {
  classification: IntentCapabilityClass;
  rationale: string;
  npcPath?: "intent" | "system_mediated" | "not_applicable";
  playerPath?: "intent" | "not_applicable";
}

const lifecycle = (rationale: string): IntentCapabilityWaiver => ({
  classification: "system_lifecycle",
  rationale,
  npcPath: "system_mediated",
  playerPath: "not_applicable",
});

const expression = (rationale: string): IntentCapabilityWaiver => ({
  classification: "player_expression",
  rationale,
  npcPath: "not_applicable",
  playerPath: "intent",
});

/**
 * Explicit intent asymmetry dispositions.
 *
 * A shared gameplay action is not listed here unless it has a real NPC path
 * through system-mediated simulation rather than a same-named NPC emitter.
 */
export const INTENT_CAPABILITY_WAIVERS: Partial<Record<AnyIntent["type"], IntentCapabilityWaiver>> =
  {
    aging: lifecycle("Age changes are authoritative lifecycle effects, not player commands."),
    pregnancy_check: lifecycle("Pregnancy checks are scheduled biological lifecycle processing."),
    pregnancy_resolution: lifecycle(
      "Foaling outcomes are scheduled biological lifecycle processing.",
    ),

    campaign_creation: expression(
      "Campaign plans are player strategy artifacts; NPC campaigns use campaign AI state.",
    ),
    campaign_deletion: expression("Deleting a player-authored campaign has no NPC counterpart."),
    campaign_flag_dismissal: expression(
      "Dismissing player campaign advice is a UI workflow, not a world action.",
    ),
    campaign_slot: expression("Manual campaign-slot editing is a player planning surface."),
    auto_manage_toggle: expression("Auto-management is a player delegation preference."),

    consignment_withdrawal: expression(
      "Public auction withdrawal is currently a player-facing market control.",
    ),
    insurance_cancel: expression(
      "Manual policy cancellation is currently a player-facing insurance control.",
    ),
    jockey_assignment: {
      classification: "shared_action",
      rationale:
        "NPC entries select jockeys and tactics during race-entry execution rather than queueing a persistent assignment intent.",
      npcPath: "system_mediated",
      playerPath: "intent",
    },
    jockey_release: {
      classification: "shared_action",
      rationale:
        "NPC contract expiry and retention are processed by the jockey phase rather than a manual release action.",
      npcPath: "system_mediated",
      playerPath: "intent",
    },
    pasture_retirement: lifecycle(
      "NPC pasture retirement is automatic lifecycle behavior; the intent is the player's voluntary path.",
    ),
    race_resolution: lifecycle(
      "Race resolution is a system/terminal race command, not a shared management action.",
    ),
    rename: expression("Player horse naming is identity customization."),
    reroll_silk: expression("Silk generation is player identity customization."),
    scout: {
      classification: "shared_action",
      rationale:
        "NPCs use persistent AI observation and scouting model state rather than paying for the player's report workflow.",
      npcPath: "system_mediated",
      playerPath: "intent",
    },
    stewards_inquiry: lifecycle(
      "Stewards generate inquiries from race outcomes; the intent is a player report channel.",
    ),
    stud_retirement: {
      classification: "shared_action",
      rationale:
        "NPC stallion retirement is lifecycle-driven by age and breeding history rather than a manual stud-fee action.",
      npcPath: "system_mediated",
      playerPath: "intent",
    },
    syndicate_fee_distribution: lifecycle(
      "Fee distribution is emitted by breeding resolution for all owners, including NPCs.",
    ),
    tactics: {
      classification: "shared_action",
      rationale:
        "NPC tactics are attached to entries by race-entry AI rather than dispatched as a player tactics intent.",
      npcPath: "system_mediated",
      playerPath: "intent",
    },

    cartel_action: {
      classification: "npc_world_behavior",
      rationale: "Cartel coordination is NPC world behavior with player-observable consequences.",
      npcPath: "intent",
      playerPath: "not_applicable",
    },
    diplomatic_action: {
      classification: "npc_world_behavior",
      rationale: "Inter-NPC diplomacy is world behavior rather than a player-to-NPC command.",
      npcPath: "intent",
      playerPath: "not_applicable",
    },
    outpost_action: {
      classification: "shared_action",
      rationale:
        "NPCs create and staff outposts through intents; player outpost creation uses a dedicated management flow.",
      npcPath: "intent",
      playerPath: "not_applicable",
    },
  };
