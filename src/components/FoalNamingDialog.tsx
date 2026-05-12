import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Check, AlertCircle } from "lucide-react";
import { useGallopStore } from "@/game/store";
import { generateProceduralHorseName } from "@/core/horse/naming/nameGenerator";
import { validateHorseName } from "@/core/horse/naming/jockeyClubRules";
import { createRng } from "@/game/rng";
import { genderLabel } from "@/core/horse/gender";

interface FoalNamingDialogProps {
  foalId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const FoalNamingDialog: React.FC<FoalNamingDialogProps> = ({ foalId, isOpen, onClose }) => {
  const horses = useGallopStore((s) => s.horses);
  const renameHorse = useGallopStore((s) => s.renameHorse);
  const foal = useMemo(() => horses.find((h) => h.id === foalId), [horses, foalId]);

  const [name, setName] = useState("");
  const [validation, setValidation] = useState<{ valid: boolean; reason?: string }>({
    valid: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize with current name or a suggestion
  useEffect(() => {
    if (foal && isOpen) {
      if (foal.name && !foal.name.startsWith("Foal #")) {
        setName(foal.name);
      } else {
        generateSuggestion();
      }
    }
  }, [foal, isOpen]);

  const generateSuggestion = useCallback(() => {
    if (!foal) return;
    const rng = createRng(`foal-name-${foal.id}-${Date.now()}`);
    const existingNames = new Set(horses.map((h) => h.name));
    const suggestion = generateProceduralHorseName(
      { sireName: foal.sireName, damName: foal.damName, existingNames },
      rng,
    );
    setName(suggestion);
    const validation = validateHorseName(suggestion, existingNames);
    setValidation({ valid: validation.isValid, reason: validation.reason });
  }, [foal, horses]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    const existingNames = new Set(horses.map((h) => h.name));
    const validation = validateHorseName(newName, existingNames);
    setValidation({ valid: validation.isValid, reason: validation.reason });
  };

  const handleSubmit = async () => {
    if (!foal || !validation.valid) return;

    setIsSubmitting(true);
    try {
      renameHorse(foal.id, name);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!foal) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            Name Your Foal
            <Badge variant="outline" className="text-xs border-amber-500 text-amber-500">
              New Born
            </Badge>
          </DialogTitle>
          <p className="text-slate-400 text-sm">
            {genderLabel(foal.gender)} by {foal.sireName} out of {foal.damName}
          </p>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-slate-300">
              Horse Name
            </Label>
            <div className="relative">
              <Input
                id="name"
                value={name}
                onChange={handleNameChange}
                className="bg-slate-950 border-slate-800 text-white pr-10"
                placeholder="Enter horse name..."
                maxLength={18}
              />
              <button
                onClick={generateSuggestion}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-500 transition-colors"
                title="Generate random name"
                aria-label="Generate random name"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {!validation.valid && (
              <p className="text-rose-500 text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {validation.reason}
              </p>
            )}
            {validation.valid && name.length > 0 && (
              <p className="text-emerald-500 text-xs flex items-center gap-1">
                <Check className="w-3 h-3" />
                Name is valid and available
              </p>
            )}
          </div>

          <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Jockey Club Rules
            </h4>
            <ul className="grid gap-2 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-slate-700 mt-1.5 shrink-0" />
                Maximum 18 characters including spaces
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-slate-700 mt-1.5 shrink-0" />
                No punctuation except internal apostrophes
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-slate-700 mt-1.5 shrink-0" />
                Must be unique within the current world
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!validation.valid || isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isSubmitting ? "Naming..." : "Confirm Name"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
