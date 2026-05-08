import type { WritableDraft } from "immer/dist/internal";
import type { GameState } from "@/game/types";
import type { AnyImpact } from "../impacts";
import type { ImpactHandler } from "./types";
import { getReputationTier, createReputationEvent } from "@/core/reputation";
import { createTransaction } from "@/core/transactions";

export class SystemHandler implements ImpactHandler {
  canHandle(type: string): boolean {
    return [
      "horse_creation",
      "horse_deletion",
      "log",
      "pace_sample",
      "campaign_slot",
      "campaign_flag",
      "campaign_flag_dismissal",
      "campaign_creation",
      "campaign_deletion",
      "auto_manage_toggle",
      "claimResolution",
      "reputation_change",
      "transaction"
    ].includes(type);
  }

  handle(draft: WritableDraft<GameState>, impact: AnyImpact): void {
    switch (impact.type) {
      case "horse_creation": {
        const { horse } = impact;
        draft.horses.push(horse);
        break;
      }

      case "horse_deletion": {
        const { horseId } = impact;
        const index = draft.horses.findIndex((h) => h.id === horseId);
        if (index !== -1) {
          draft.horses.splice(index, 1);
        }
        break;
      }

      case "log": {
        const { text } = impact;
        draft.log = [{ day: impact.day, text }, ...draft.log].slice(0, 50);
        break;
      }

      case "pace_sample": {
        const { distance, time } = impact;
        if (!draft.paceSamples) {
          draft.paceSamples = {};
        }
        const bucket = Math.floor(distance / 100);
        if (!draft.paceSamples[bucket]) {
          draft.paceSamples[bucket] = [];
        }
        draft.paceSamples[bucket].push(time);
        break;
      }

      case "campaign_slot": {
        const { horseId, slotIndex, slot } = impact;
        const campaign = draft.campaigns?.find((c) => c.horseId === horseId);
        if (campaign) {
          campaign.slots[slotIndex] = { ...campaign.slots[slotIndex], ...slot };
        }
        break;
      }

      case "campaign_flag": {
        const { horseId, flag } = impact;
        const campaign = draft.campaigns?.find((c) => c.horseId === horseId);
        if (campaign) {
          campaign.flags.push(flag);
        }
        break;
      }

      case "campaign_flag_dismissal": {
        const { horseId, flag } = impact;
        const campaign = draft.campaigns?.find((c) => c.horseId === horseId);
        if (campaign) {
          campaign.flags = campaign.flags.filter(
            (f) =>
              f.type !== flag.type || f.day !== flag.day || f.description !== flag.description,
          );
        }
        break;
      }

      case "campaign_creation": {
        const { campaign } = impact;
        if (!draft.campaigns) draft.campaigns = [];
        draft.campaigns.push(campaign);
        break;
      }

      case "campaign_deletion": {
        const { horseId } = impact;
        if (draft.campaigns) {
          const index = draft.campaigns.findIndex((c) => c.horseId === horseId);
          if (index !== -1) {
            draft.campaigns.splice(index, 1);
          }
        }
        break;
      }

      case "auto_manage_toggle": {
        const { horseId, autoManaged } = impact;
        const campaign = draft.campaigns?.find((c) => c.horseId === horseId);
        if (campaign) {
          campaign.autoManaged = autoManaged;
        }
        break;
      }

      case "reputation_change": {
        const { delta, reason, source, metadata } = impact;
        if (draft.reputation) {
          const newEvent = createReputationEvent(source as any, delta, reason, impact.day, metadata);
          draft.reputation.events.push(newEvent);
          draft.reputation.score += delta;
          draft.reputation.tier = getReputationTier(draft.reputation.score);
          if (source === "race_win") {
            draft.reputation.totalWins += 1;
          }
        }
        break;
      }

      case "transaction": {
        const { amount, category, description, metadata } = impact;
        if (!draft.transactions) draft.transactions = [];
        const type = amount >= 0 ? "income" : "expense";
        const newTransaction = createTransaction(
          type,
          category as any,
          amount,
          description,
          impact.day,
          draft.cash + amount,
          metadata,
        );
        draft.transactions.push(newTransaction);
        break;
      }
    }
  }
}
