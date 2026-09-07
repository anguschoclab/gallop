import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Race, Horse } from "@/game/types";
import type { StewardsInquiryIntent } from "@/core/resolver/systemIntents";
import type { InquiryType } from "@/core/stewards/stewardTypes";
import { formatInquiryType } from "@/core/stewards/stewardTypes";
import { generateUUID } from "@/core/uuid";

export interface ObjectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  race: Race;
  horses: Record<string, Horse | { id: string; name: string }>;
  reportingHorseId: string;
  onSubmit: (intent: StewardsInquiryIntent) => void;
}

const INQUIRY_TYPES: { value: InquiryType; label: string; description: string }[] = [
  {
    value: "interference",
    label: "Interference",
    description: "Impending or altering another horse's running line in the stretch or turn.",
  },
  {
    value: "lane_violation",
    label: "Lane Violation",
    description: "Drifting in or out without sufficient clearance, crossing paths carelessly.",
  },
  {
    value: "improper_riding",
    label: "Improper Riding",
    description: "Dangerous or overly aggressive maneuvering by the opposing jockey.",
  },
  {
    value: "equipment_issue",
    label: "Equipment Issue",
    description: "Unreported gear, illegal blinkers, or dislodged saddle weights.",
  },
];

export function ObjectionModal({
  isOpen,
  onClose,
  race,
  horses,
  reportingHorseId,
  onSubmit,
}: ObjectionModalProps) {
  // Extract candidate accused horses (participants in race other than reporting horse)
  const candidateIds = (race.entries ?? race.result ?? [])
    .map((e) => e.horseId)
    .filter((id) => id && id !== reportingHorseId);

  const [accusedHorseId, setAccusedHorseId] = useState<string>(candidateIds[0] ?? "");
  const [inquiryType, setInquiryType] = useState<InquiryType>("interference");
  const [description, setDescription] = useState<string>("");

  useEffect(() => {
    if (candidateIds.length > 0 && !candidateIds.includes(accusedHorseId)) {
      setAccusedHorseId(candidateIds[0]);
    }
  }, [candidateIds, accusedHorseId]);

  const reportingHorse = horses[reportingHorseId];
  const accusedHorse = horses[accusedHorseId];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accusedHorseId) return;

    const defaultDesc = `Formal objection lodged by connections of ${reportingHorse?.name ?? reportingHorseId} against ${accusedHorse?.name ?? accusedHorseId} for ${formatInquiryType(inquiryType)}.`;

    onSubmit({
      id: generateUUID(),
      entityId: reportingHorseId,
      source: "player",
      day: race.day ?? 1,
      priority: 1,
      type: "stewards_inquiry",
      raceId: race.id,
      accusedHorseId,
      reportingHorseId,
      inquiryType,
      description: description.trim() || defaultDesc,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-cream">
        <DialogHeader>
          <DialogTitle className="text-base font-black uppercase tracking-wider text-amber-400">
            Lodge Stewards Inquiry
          </DialogTitle>
          <DialogDescription className="text-xs text-cream/60">
            Submit a formal objection to race officials regarding an infraction during{" "}
            <span className="font-semibold text-cream">{race.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Reporting Horse */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-cream/50">
              Lodging On Behalf Of
            </label>
            <div className="p-2.5 rounded bg-slate-950/60 border border-white/5 text-sm font-semibold text-cream">
              {reportingHorse?.name ?? reportingHorseId}
            </div>
          </div>

          {/* Accused Horse Selection */}
          <div className="space-y-1">
            <label
              htmlFor="accused-horse-select"
              className="text-[10px] font-black uppercase tracking-widest text-cream/50"
            >
              Infringing Horse (Accused)
            </label>
            <select
              id="accused-horse-select"
              value={accusedHorseId}
              onChange={(e) => setAccusedHorseId(e.target.value)}
              className="w-full h-10 px-3 rounded bg-slate-950/80 border border-white/10 text-sm font-medium text-cream focus:outline-none focus:border-amber-400 font-mono"
            >
              {candidateIds.map((id) => (
                <option key={id} value={id}>
                  {horses[id]?.name ?? id}
                </option>
              ))}
            </select>
          </div>

          {/* Infraction Category */}
          <div className="space-y-1">
            <label
              htmlFor="inquiry-type-select"
              className="text-[10px] font-black uppercase tracking-widest text-cream/50"
            >
              Infraction Category
            </label>
            <select
              id="inquiry-type-select"
              value={inquiryType}
              onChange={(e) => setInquiryType(e.target.value as InquiryType)}
              className="w-full h-10 px-3 rounded bg-slate-950/80 border border-white/10 text-sm font-medium text-cream focus:outline-none focus:border-amber-400"
            >
              {INQUIRY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-cream/40 italic">
              {INQUIRY_TYPES.find((t) => t.value === inquiryType)?.description}
            </p>
          </div>

          {/* Statement / Details */}
          <div className="space-y-1">
            <label
              htmlFor="objection-notes"
              className="text-[10px] font-black uppercase tracking-widest text-cream/50"
            >
              Notes & Evidence (Optional)
            </label>
            <textarea
              id="objection-notes"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Swerved inward into running line at the 200m pole..."
              className="w-full p-2.5 rounded bg-slate-950/80 border border-white/10 text-xs text-cream placeholder-cream/20 focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs uppercase border-white/10 hover:bg-white/5 text-cream/70"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!accusedHorseId}
              className="text-xs font-black uppercase bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono tracking-wider"
            >
              Submit Formal Objection
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
