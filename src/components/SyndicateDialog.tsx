import { useState } from "react";
import { useGame } from "@/game/store";
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
import { formatCurrency } from "@/lib/formatting";
import { toast } from "sonner";

interface SyndicateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stallionId: string;
  stallionName: string;
}

export function SyndicateDialog({ isOpen, onClose, stallionId, stallionName }: SyndicateDialogProps) {
  const [totalShares, setTotalShares] = useState(40);
  const [sharePrice, setSharePrice] = useState(10000);
  const [initialPlayerShares, setInitialPlayerShares] = useState(20);

  const createSyndicate = useGame((s) => s.createSyndicate);
  const cash = useGame((s) => s.cash);

  const handleCreate = () => {
    const initialCost = initialPlayerShares * sharePrice;
    if (cash < initialCost) {
      toast.error(`Insufficient cash. Need ${formatCurrency(initialCost)}.`);
      return;
    }

    const initialShareholders: Record<string, number> = {
      player: initialPlayerShares,
    };

    const result = createSyndicate(stallionId, totalShares, sharePrice, initialShareholders);
    if (result.ok) {
      toast.success(`Syndicate created for ${stallionName}!`);
      onClose();
    } else {
      toast.error(result.reason);
    }
  };

  const totalValue = totalShares * sharePrice;
  const playerValue = initialPlayerShares * sharePrice;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase italic text-primary">
            Syndicate {stallionName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="totalShares">Total Shares</Label>
            <Input
              id="totalShares"
              type="number"
              min="10"
              max="100"
              value={totalShares}
              onChange={(e) => setTotalShares(Number(e.target.value))}
              className="bg-muted border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sharePrice">Share Price</Label>
            <Input
              id="sharePrice"
              type="number"
              min="1000"
              step="1000"
              value={sharePrice}
              onChange={(e) => setSharePrice(Number(e.target.value))}
              className="bg-muted border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="initialPlayerShares">Your Initial Shares</Label>
            <Input
              id="initialPlayerShares"
              type="number"
              min="1"
              max={totalShares}
              value={initialPlayerShares}
              onChange={(e) => setInitialPlayerShares(Number(e.target.value))}
              className="bg-muted border-border"
            />
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Syndicate Value</span>
              <span className="font-bold">{formatCurrency(totalValue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Your Initial Investment</span>
              <span className="font-bold text-primary">{formatCurrency(playerValue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Your Ownership</span>
              <span className="font-bold">
                {Math.round((initialPlayerShares / totalShares) * 100)}%
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} className="bg-primary text-primary-foreground">
            Create Syndicate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
