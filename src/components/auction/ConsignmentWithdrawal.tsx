/**
 * ConsignmentWithdrawal.tsx - Withdrawal protocol for player consignments
 *
 * Allows players to withdraw their consigned horses from an auction.
 * Extracted from auction.$saleId.tsx.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Info } from "lucide-react";
import type { AuctionLot, Horse, AuctionSale } from "@/game/types";

interface ConsignmentWithdrawalProps {
  horse: Horse;
  currentLot: AuctionLot;
  sale: AuctionSale;
  currentDay: number;
  onWithdraw: () => void;
}

export function ConsignmentWithdrawal({
  horse,
  currentLot,
  sale,
  currentDay,
  onWithdraw,
}: ConsignmentWithdrawalProps) {
  const canWithdraw = sale.day > currentDay && !currentLot.withdrawn;

  return (
    <Card className="bg-slate-900/40 border-destructive/20 rounded-none shadow-xl border-t-2 border-t-destructive/40">
      <CardContent className="p-6 flex items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="text-xs font-black text-destructive uppercase tracking-widest flex items-center gap-2">
            <Info className="h-3 w-3" /> Withdrawal protocol active
          </div>
          <p className="text-[10px] font-mono text-cream/30 uppercase tracking-tighter">
            Emergency decommissioning of asset from public catalog.
          </p>
        </div>
        {canWithdraw ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="h-10 px-6 font-black uppercase text-[10px] tracking-widest rounded-none"
              >
                Withdraw
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-slate-950 border-destructive/30 rounded-none">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive uppercase font-black tracking-widest">
                  Confirm Withdrawal
                </AlertDialogTitle>
                <AlertDialogDescription className="text-cream/60 font-mono text-xs uppercase tracking-tighter">
                  Removal of <strong>{horse.name}</strong> from catalog. No transaction proceeds
                  will be generated.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-none font-black text-[10px] uppercase tracking-widest border-white/10 hover:bg-white/5">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90 rounded-none font-black text-[10px] uppercase tracking-widest"
                  onClick={onWithdraw}
                >
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button
            disabled
            variant="destructive"
            className="h-10 px-6 font-black uppercase text-[10px] tracking-widest rounded-none opacity-20"
          >
            Withdrawal closed
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
