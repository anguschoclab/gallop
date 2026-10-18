import type { AnyIntent } from "./intents";

export const INTENT_TYPE_CONTRACTS = [
  "training",
  "race_entry",
  "race_withdrawal",
  "breeding",
  "stud_retirement",
  "purchase",
  "jockey_contract",
  "jockey_release",
  "jockey_assignment",
  "scout",
  "consignment",
  "consignment_withdrawal",
  "gelding",
  "reroll_silk",
  "rename",
  "campaign_slot",
  "campaign_flag_dismissal",
  "campaign_creation",
  "campaign_deletion",
  "auto_manage_toggle",
  "upkeep",
  "aging",
  "energy",
  "pregnancy_check",
  "pregnancy_resolution",
  "race_resolution",
  "claiming",
  "withdraw_from_claiming",
  "tactics",
  "transport",
  "staff",
  "facility_upgrade",
  "outpost_action",
  "pasture_retirement",
  "update_stud_fee",
  "syndicate_creation",
  "share_purchase",
  "share_sale",
  "syndicate_fee_distribution",
  "insurance_purchase",
  "insurance_cancel",
  "insurance_claim",
  "stewards_inquiry",
  "diplomatic_action",
  "cartel_action",
] as const satisfies readonly AnyIntent["type"][];

export type RegisteredIntentType = (typeof INTENT_TYPE_CONTRACTS)[number];

type MissingIntentContract = Exclude<AnyIntent["type"], RegisteredIntentType>;
type ExtraIntentContract = Exclude<RegisteredIntentType, AnyIntent["type"]>;

const _assertNoMissingIntentContracts: [MissingIntentContract] extends [never] ? true : never =
  true;
const _assertNoExtraIntentContracts: [ExtraIntentContract] extends [never] ? true : never = true;

export const INTENT_TYPE_SET: ReadonlySet<string> = new Set(INTENT_TYPE_CONTRACTS);
