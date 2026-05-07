import React, { useState, useEffect, useMemo } from "react";
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

interface FoalNamingDialogProps {
  foalId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const FoalNamingDialog: React.FC<FoalNamingDialogProps> = ({ foalId, isOpen, onClose }) => {
  const { horses, usedHorseNames, hallOfFame, renameHorse } = useGallopStore();
  const foal = horses.find((h) => h.id === foalId);

  const [name, setName] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const existingNamesSet = useMemo(() => new Set(usedHorseNames), [usedHorseNames]);
  const deceasedNamesSet = useMemo(
    () => new Set(hallOfFame.map((h) => h.name.toLowerCase())),
    [hallOfFame],
  );

  const generateSuggestions = () => {
    if (!foal) return;
    const rng = createRng(Date.now());
    const newSuggestions: string[] = [];

    // Generate 3 suggestions
    for (let i = 0; i < 3; i++) {
      const suggestion = generateProceduralHorseName(
        {
          sireName: foal.sireName,
          damName: foal.damName,
          existingNames: existingNamesSet,
          deceasedNames: deceasedNamesSet,
        },
        rng,
        { strategy: "hybrid" },
      );
      newSuggestions.push(suggestion);
    }
    setSuggestions(newSuggestions);
  };

  useEffect(() => {
    if (isOpen && foal) {
      generateSuggestions();
      setName("");
      setError(null);
    }
  }, [isOpen, foalId]);

  useEffect(() => {
    if (name) {
      const validation = validateHorseName(name, existingNamesSet, deceasedNamesSet);
      if (!validation.isValid) {
        setError(validation.reason || "Invalid name.");
      } else {
        setError(null);
      }
    } else {
      setError(null);
    }
  }, [name, existingNamesSet, deceasedNamesSet]);

  const handleSave = () => {
    if (!error && name) {
      renameHorse(foalId, name);
      onClose();
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
            {foal.gender === "colt" ? "Colt" : "Filly"} by {foal.sireName} out of {foal.damName}
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
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter a unique name..."
                className={`bg-slate-950 border-slate-800 text-white pr-10 ${error ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-emerald-500"}`}
                maxLength={18}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {name && !error ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : name && error ? (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                ) : null}
              </div>
            </div>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            <p className="text-[10px] text-slate-500">Max 18 characters. No special symbols.</p>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300">Suggested Names</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={generateSuggestions}
                className="h-6 px-2 text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setName(s)}
                  className="text-left px-3 py-2 rounded-md bg-slate-800/50 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 transition-colors text-sm font-medium"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            Skip for Now
          </Button>
          <Button
            onClick={handleSave}
            disabled={!!error || !name}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          >
            Register Name
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
